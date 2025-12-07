// xAI Grok API Client

const GROK_CHAT_API_URL = "https://api.x.ai/v1/chat/completions"
const GROK_IMAGE_API_URL = "https://api.x.ai/v1/images/generations"

// Available models
export const GROK_MODELS = {
  // Latest flagship
  GROK_3: "grok-3-latest",
  // Fast reasoning (chain of thought)
  GROK_4_FAST_REASONING: "grok-4-1-fast-reasoning",
  // Fast non-reasoning (direct answers)
  GROK_4_FAST: "grok-4-1-fast-non-reasoning",
} as const

// Default model for different use cases
export const DEFAULT_MODELS = {
  generation: GROK_MODELS.GROK_3, // Rich content generation
  structured: GROK_MODELS.GROK_4_FAST, // JSON outputs
  reasoning: GROK_MODELS.GROK_4_FAST_REASONING, // Complex analysis
} as const

interface GrokMessage {
  role: "system" | "user" | "assistant"
  content: string
}

// Live Search source types
interface WebSearchSource {
  type: "web"
  country?: string
  allowed_websites?: string[]
  excluded_websites?: string[]
  safe_search?: boolean
}

interface XSearchSource {
  type: "x"
  included_x_handles?: string[]
  excluded_x_handles?: string[]
  post_favorite_count?: number
  post_view_count?: number
}

interface NewsSearchSource {
  type: "news"
  country?: string
  excluded_websites?: string[]
  safe_search?: boolean
}

interface RssSearchSource {
  type: "rss"
  links: string[]
}

type SearchSource =
  | WebSearchSource
  | XSearchSource
  | NewsSearchSource
  | RssSearchSource

interface SearchParameters {
  mode?: "auto" | "on" | "off"
  return_citations?: boolean
  from_date?: string // ISO8601 YYYY-MM-DD
  to_date?: string // ISO8601 YYYY-MM-DD
  max_search_results?: number
  sources?: SearchSource[]
}

interface GrokCompletionOptions {
  messages: GrokMessage[]
  model?: string
  temperature?: number
  max_tokens?: number
  response_format?: {
    type: "json_schema"
    json_schema: {
      name: string
      strict: boolean
      schema: Record<string, unknown>
    }
  }
  search_parameters?: SearchParameters
}

interface GrokResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    num_sources_used?: number // Live Search: number of sources consulted
  }
  citations?: string[] // Live Search: URLs of sources used
}

export async function grokCompletion(
  options: GrokCompletionOptions
): Promise<GrokResponse> {
  const apiKey = process.env.XAI_API_KEY

  if (!apiKey) {
    throw new Error("XAI_API_KEY environment variable is not set")
  }

  const response = await fetch(GROK_CHAT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODELS.generation,
      messages: options.messages,
      temperature: options.temperature ?? 0.6, // Lowered from 0.7 for more consistent quality
      max_tokens: options.max_tokens ?? 2048,
      ...(options.response_format && {
        response_format: options.response_format,
      }),
      ...(options.search_parameters && {
        search_parameters: options.search_parameters,
      }),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Grok API error: ${response.status} - ${error}`)
  }

  return response.json()
}

// ============================================
// Image Generation (grok-imagine)
// ============================================

interface GrokImageOptions {
  prompt: string
  n?: number // Number of images (1-10)
  response_format?: "url" | "b64_json"
  // Note: grok-imagine-v0p9 doesn't support size parameter - it outputs variable sizes
}

interface GrokImageResponse {
  created: number
  data: Array<{
    url?: string
    b64_json?: string
    revised_prompt?: string
  }>
}

export async function grokGenerateImage(
  options: GrokImageOptions
): Promise<GrokImageResponse> {
  const apiKey = process.env.XAI_API_KEY

  if (!apiKey) {
    throw new Error("XAI_API_KEY environment variable is not set")
  }

  try {
    const response = await fetch(GROK_IMAGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-imagine-v0p9",
        prompt: options.prompt,
        n: options.n ?? 1,
        response_format: options.response_format ?? "url",
        // Note: grok-imagine-v0p9 doesn't support size parameter
      }),
    })

    if (!response.ok) {
      let errorMessage: string
      try {
        const errorBody = await response.json()
        errorMessage =
          errorBody.error?.message ||
          errorBody.message ||
          JSON.stringify(errorBody)
      } catch {
        errorMessage = await response.text().catch(() => "Unknown error")
      }

      console.error("[Grok Image] API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        promptPreview: options.prompt.substring(0, 100),
      })

      throw new Error(
        `Grok Image API error (${response.status}): ${errorMessage}`
      )
    }

    return response.json()
  } catch (error) {
    // Re-throw if it's already our error
    if (error instanceof Error && error.message.includes("Grok Image API")) {
      throw error
    }
    // Handle network/fetch errors
    console.error("[Grok Image] Network error:", error)
    throw new Error(
      `Grok Image API network error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    )
  }
}

// Helper for structured JSON outputs
export async function grokStructuredOutput<T>(
  messages: GrokMessage[],
  schemaName: string,
  schema: Record<string, unknown>,
  options?: { temperature?: number; model?: string }
): Promise<T> {
  const response = await grokCompletion({
    messages,
    model: options?.model,
    temperature: options?.temperature ?? 0.3, // Lower temp for structured outputs
    response_format: {
      type: "json_schema",
      json_schema: {
        name: schemaName,
        strict: true,
        schema,
      },
    },
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error("No content in Grok response")
  }

  return JSON.parse(content) as T
}

// Helper for conversational responses
export async function grokChat(
  systemPrompt: string,
  messages: GrokMessage[],
  options?: { temperature?: number; model?: string; max_tokens?: number }
): Promise<string> {
  const response = await grokCompletion({
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    model: options?.model ?? DEFAULT_MODELS.generation,
    temperature: options?.temperature ?? 0.6, // Lowered for more consistent quality
    max_tokens: options?.max_tokens ?? 1024,
  })

  return response.choices[0]?.message?.content || ""
}

// ============================================
// Live Search (Web, X, News grounding)
// ============================================

interface LiveSearchResult {
  content: string
  citations: string[]
  sourcesUsed: number
}

/**
 * Grok with Live Search - queries real-time web, X, and news data
 * Pricing: $0.025 per source used
 */
export async function grokLiveSearch(
  systemPrompt: string,
  userMessage: string,
  options?: {
    temperature?: number
    model?: string
    max_tokens?: number
    sources?: SearchSource[]
    fromDate?: string
    toDate?: string
    maxResults?: number
  }
): Promise<LiveSearchResult> {
  const response = await grokCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    model: options?.model ?? DEFAULT_MODELS.generation,
    temperature: options?.temperature ?? 0.5,
    max_tokens: options?.max_tokens ?? 1024,
    search_parameters: {
      mode: "on",
      return_citations: true,
      max_search_results: options?.maxResults ?? 10,
      from_date: options?.fromDate,
      to_date: options?.toDate,
      sources: options?.sources ?? [
        { type: "web" },
        { type: "news" },
        { type: "x" },
      ],
    },
  })

  return {
    content: response.choices[0]?.message?.content || "",
    citations: response.citations || [],
    sourcesUsed: response.usage?.num_sources_used || 0,
  }
}

// Export types for use in other modules
export type {
  GrokMessage,
  GrokResponse,
  SearchParameters,
  SearchSource,
  WebSearchSource,
  XSearchSource,
  NewsSearchSource,
  RssSearchSource,
  LiveSearchResult,
}
