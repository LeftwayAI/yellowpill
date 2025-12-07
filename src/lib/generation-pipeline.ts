// Simplified Generation Pipeline
// Single-step generation that mirrors natural creative ideation

import { grokChat, GROK_MODELS } from "./grok";
import type { Poster, PostType } from "@/types/database";

// Debug info for testing/iteration
export interface PipelineStep {
  step: string;
  model: string;
  input: string;
  output: string;
  duration_ms: number;
}

export interface PipelineResult {
  content: string;
  steps: PipelineStep[];
  total_duration_ms: number;
  selected_concept: string;
  seed?: string;
}

// ============================================
// RANDOMIZATION SEEDS
// Forces variety by constraining generation in random ways
// ============================================

const SEASONS = ["spring", "summer", "fall", "winter"];
const TIMES_OF_DAY = ["early morning", "mid-morning", "afternoon", "golden hour", "evening", "late night"];
const YEARS_AHEAD = [1, 2, 3, 5, 7, 10];

// Quote categories that don't encourage hallucination
const QUOTE_SOURCES = [
  { category: "writer", examples: "Virginia Woolf, James Baldwin, Joan Didion, Toni Morrison, Jorge Luis Borges" },
  { category: "philosopher", examples: "Seneca, Marcus Aurelius, Simone de Beauvoir, Albert Camus, Alan Watts" },
  { category: "scientist", examples: "Richard Feynman, Marie Curie, Carl Sagan, Ada Lovelace, Nikola Tesla" },
  { category: "artist", examples: "Patti Smith, David Bowie, Frida Kahlo, Jean-Michel Basquiat, Yoko Ono" },
  { category: "filmmaker", examples: "Werner Herzog, Agnes Varda, Akira Kurosawa, Maya Deren, Andrei Tarkovsky" },
  { category: "poet", examples: "Mary Oliver, Rainer Maria Rilke, Ocean Vuong, Lucille Clifton, Pablo Neruda" },
];

const QUOTE_THEMES = [
  "creativity and making things",
  "fear and courage",
  "change and transformation", 
  "patience and time",
  "solitude and connection",
  "failure and persistence",
  "authenticity and self",
  "work and craft",
];

interface GenerationSeed {
  type: "quote" | "time";
  value: string;
  constraint: string;
}

function generateSeed(posterId: string, postType: string): GenerationSeed | null {
  // Quick Quote (ID is still "daily-dose" for backward compat)
  if (posterId === "daily-dose") {
    const source = QUOTE_SOURCES[Math.floor(Math.random() * QUOTE_SOURCES.length)];
    const theme = QUOTE_THEMES[Math.floor(Math.random() * QUOTE_THEMES.length)];
    
    return {
      type: "quote",
      value: `${source.category} / ${theme}`,
      constraint: `CONSTRAINT: Find a real quote from a ${source.category} (like ${source.examples}) about ${theme}.

CRITICAL: You MUST use a real, verified quote. Do NOT make up quotes. Do NOT modify quotes. If you're not 100% certain the quote is real and correctly attributed, pick a different one you ARE certain about.

The quote should feel unexpected — not the obvious choice.`,
    };
  }
  
  // Scenes From Your Future: Random time/season/year
  if (posterId === "scenes-future") {
    const season = SEASONS[Math.floor(Math.random() * SEASONS.length)];
    const time = TIMES_OF_DAY[Math.floor(Math.random() * TIMES_OF_DAY.length)];
    const yearsAhead = YEARS_AHEAD[Math.floor(Math.random() * YEARS_AHEAD.length)];
    
    return {
      type: "time",
      value: `${season}, ${time}, ${yearsAhead}y`,
      constraint: `CONSTRAINT: The scene MUST take place in ${season}, during ${time}, approximately ${yearsAhead} year${yearsAhead > 1 ? "s" : ""} from now. Start with a time anchor like "It's ${season}, ${new Date().getFullYear() + yearsAhead}. ${time.charAt(0).toUpperCase() + time.slice(1)}..."`,
    };
  }
  
  return null;
}

// The core generation prompt - designed to encourage natural ideation
// Key principles:
// 1. Don't enumerate specific items from the manifest
// 2. Find an angle that encourages or reframes positively  
// 3. Write something that could resonate with anyone in a similar phase
// 4. Let the soul context inform the vibe, not the explicit content
function buildGenerationPrompt(
  poster: Poster,
  postType: PostType,
  soulSummary: string,
  seed: GenerationSeed | null
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `${poster.system_prompt}

Style Guide:
${poster.style_guide}

APPROACH:
You're writing for someone you deeply understand. The soul context below gives you a sense of who they are — their phase of life, their tensions, their drives.

But here's the key: DON'T reference specific items they mentioned. Instead, let their context inspire an angle that would resonate with ANYONE navigating similar themes.

Think of it like this: You're not writing "Since you're afraid of failure..." You're writing something that happens to speak to fear of failure in a way that feels like a discovery, not a call-out.

The best posts feel like the reader found them organically — not like a robot read their profile.

RULES:
- Never use the reader's name
- Never say "you mentioned" or reference their specific answers
- Write for a general audience — this should feel standalone
- Find an encouraging or reframing angle, not just reflection
- Be specific enough to land, general enough to discover`;

  let userPrompt = `Write a "${postType.type}" post.

Post type description: ${postType.description}

Soul context (use to inform the vibe, NOT to reference explicitly):
${soulSummary}
`;

  // Add seed constraint if present
  if (seed) {
    userPrompt += `
${seed.constraint}
`;
  }

  userPrompt += `
Constraints:
- Maximum ${postType.max_length} characters
- No emojis
- No names or direct address

Generate ONLY the post content. No preamble, no explanation.`;

  return { systemPrompt, userPrompt };
}

// Single-step generation
async function generate(
  poster: Poster,
  postType: PostType,
  soulSummary: string,
  seed: GenerationSeed | null
): Promise<{ content: string; step: PipelineStep }> {
  const startTime = Date.now();
  
  const { systemPrompt, userPrompt } = buildGenerationPrompt(poster, postType, soulSummary, seed);

  const content = await grokChat(
    systemPrompt,
    [{ role: "user", content: userPrompt }],
    { 
      model: GROK_MODELS.GROK_3,
      temperature: 0.85, // Higher for more creative variation and less repetition
      max_tokens: 600 
    }
  );

  return {
    content: content.trim(),
    step: {
      step: "generation",
      model: GROK_MODELS.GROK_3,
      input: userPrompt.substring(0, 300) + "...",
      output: content.trim().substring(0, 300),
      duration_ms: Date.now() - startTime,
    },
  };
}

// MAIN PIPELINE: Now just a single generation step with randomization seed
export async function runGenerationPipeline(
  poster: Poster,
  postType: PostType,
  soulSummary: string
): Promise<PipelineResult> {
  const pipelineStart = Date.now();
  
  // Generate a randomization seed for variety
  const seed = generateSeed(poster.id, postType.type);
  
  if (seed) {
    console.log(`[Pipeline] Generating for ${poster.name} / ${postType.type} [seed: ${seed.value}]`);
  } else {
    console.log(`[Pipeline] Generating for ${poster.name} / ${postType.type}`);
  }

  const { content, step } = await generate(poster, postType, soulSummary, seed);

  const totalDuration = Date.now() - pipelineStart;
  console.log(`[Pipeline] Complete in ${totalDuration}ms`);

  return {
    content,
    steps: [step],
    total_duration_ms: totalDuration,
    selected_concept: `${poster.name} — ${postType.type}`,
    seed: seed?.value,
  };
}

// Export for admin testing - allows passing custom system/user prompts
export async function runCustomGeneration(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; model?: string }
): Promise<{ content: string; duration_ms: number }> {
  const startTime = Date.now();
  
  const content = await grokChat(
    systemPrompt,
    [{ role: "user", content: userPrompt }],
    { 
      model: options?.model ?? GROK_MODELS.GROK_3,
      temperature: options?.temperature ?? 0.75,
      max_tokens: 600 
    }
  );

  return {
    content: content.trim(),
    duration_ms: Date.now() - startTime,
  };
}

