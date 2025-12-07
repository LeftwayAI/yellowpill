import { createClient } from "@/lib/supabase/server"
import { grokChat, grokStructuredOutput, GROK_MODELS } from "@/lib/grok"
import { NextResponse } from "next/server"

// TODO: Add reply rate limiting (requires reply_log table or similar)
// For now, auth + post ownership check provides basic protection

// Schema for extracting manifest updates from conversation
const MANIFEST_UPDATE_SCHEMA = {
  type: "object",
  properties: {
    has_update: {
      type: "boolean",
      description:
        "Whether there's meaningful information to update in the manifest",
    },
    updates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "Dot notation path in manifest (e.g., 'dreams.vivid_future_scenes', 'growth.current_challenges')",
          },
          action: {
            type: "string",
            enum: ["add", "update", "remove"],
          },
          old_value: {
            type: "string",
            description: "The old value being replaced (for updates/removes)",
          },
          new_value: {
            type: "string",
            description: "The new value (for adds/updates)",
          },
          confidence: {
            type: "number",
            description: "How confident are you this is correct (0-1)",
          },
        },
        required: ["path", "action", "confidence"],
      },
    },
    summary: {
      type: "string",
      description:
        "Brief human-readable summary of what was learned (e.g., 'Noted: thinking more about books than movies')",
    },
  },
  required: ["has_update", "updates", "summary"],
  additionalProperties: false,
}

export async function POST(request: Request) {
  const supabase = await createClient()

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { postId, message } = await request.json()

    if (!postId || !message) {
      return NextResponse.json(
        { error: "Missing postId or message" },
        { status: 400 }
      )
    }

    // Get the post and poster info
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select(
        `
        *,
        poster:posters(*)
      `
      )
      .eq("id", postId)
      .eq("user_id", user.id)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Get user's manifest and soul summaries for context
    const { data: manifestData } = await supabase
      .from("soul_manifests")
      .select("manifest, soul_summaries")
      .eq("user_id", user.id)
      .single()

    const manifest = manifestData?.manifest || {}
    const soulSummaries = manifestData?.soul_summaries as {
      summaries?: Record<string, string>
    } | null

    // Pick a random soul summary for context, or create a basic one
    let soulContext = ""
    if (soulSummaries?.summaries) {
      const summaryKeys = Object.keys(soulSummaries.summaries)
      if (summaryKeys.length > 0) {
        const randomKey =
          summaryKeys[Math.floor(Math.random() * summaryKeys.length)]
        soulContext = soulSummaries.summaries[randomKey] || ""
      }
    }

    // Generate response in poster's voice
    const posterSystemPrompt = `${post.poster.system_prompt}

You are responding to a reply from the user. Stay in character as "${
      post.poster.name
    }".
Keep responses concise (1-3 sentences). Be warm and engaged.
Reference what they said and respond thoughtfully.

=== WHO THIS PERSON IS ===
${soulContext || "No additional context available."}
=== END CONTEXT ===

Use this context to inform your tone and understanding of who you're talking to, but DON'T explicitly reference their profile details. Respond naturally like a friend who knows them well.`

    const conversationContext = `Original post you wrote for them: "${post.content}"

Their reply to you: "${message}"

Respond as ${post.poster.name}. Be genuine, warm, and connected. Your response should feel like it comes from someone who truly knows and believes in them.`

    const response = await grokChat(
      posterSystemPrompt,
      [{ role: "user", content: conversationContext }],
      { model: GROK_MODELS.GROK_3, temperature: 0.7, max_tokens: 200 }
    )

    // Extract any manifest updates from the conversation
    const extractionPrompt = `Analyze this conversation for any new information about the user that should be saved to their profile.

User's current profile context:
${JSON.stringify(manifest, null, 2).slice(0, 2000)}

The post they replied to: "${post.content}"
Their reply: "${message}"

Look for:
- Changes to their dreams or goals (did they correct or evolve something?)
- New information about their interests
- Updates to their challenges or fears
- Changes in how they see themselves
- New preferences or dislikes

Only extract HIGH CONFIDENCE updates. If they're just chatting, don't force an update.
If they explicitly correct or update something from their profile, that's a clear update.`

    let manifestUpdate: string | null = null

    try {
      const extraction = await grokStructuredOutput<{
        has_update: boolean
        updates: Array<{
          path: string
          action: "add" | "update" | "remove"
          old_value?: string
          new_value?: string
          confidence: number
        }>
        summary: string
      }>(
        [
          {
            role: "system",
            content:
              "You are analyzing conversation for profile updates. Be conservative - only extract clear, confident updates.",
          },
          { role: "user", content: extractionPrompt },
        ],
        "manifest_update",
        MANIFEST_UPDATE_SCHEMA,
        { model: GROK_MODELS.GROK_3, temperature: 0.3 }
      )

      if (extraction.has_update && extraction.updates.length > 0) {
        // Filter to high-confidence updates
        const highConfidenceUpdates = extraction.updates.filter(
          (u) => u.confidence >= 0.7
        )

        if (highConfidenceUpdates.length > 0) {
          // Apply updates to manifest
          const updatedManifest = { ...manifest }

          for (const update of highConfidenceUpdates) {
            const pathParts = update.path.split(".")
            let current: Record<string, unknown> = updatedManifest

            // Navigate to the parent
            for (let i = 0; i < pathParts.length - 1; i++) {
              if (!current[pathParts[i]]) {
                current[pathParts[i]] = {}
              }
              current = current[pathParts[i]] as Record<string, unknown>
            }

            const finalKey = pathParts[pathParts.length - 1]

            if (update.action === "add" || update.action === "update") {
              // If it's an array field, add to it; otherwise set
              if (Array.isArray(current[finalKey])) {
                // For arrays, check if updating existing or adding new
                if (update.action === "update" && update.old_value) {
                  const arr = current[finalKey] as Array<
                    { value?: string } | string
                  >
                  const idx = arr.findIndex(
                    (item) =>
                      (typeof item === "string" && item === update.old_value) ||
                      (typeof item === "object" &&
                        item.value === update.old_value)
                  )
                  if (idx >= 0) {
                    if (typeof arr[idx] === "string") {
                      arr[idx] = update.new_value || ""
                    } else {
                      ;(arr[idx] as { value: string }).value =
                        update.new_value || ""
                    }
                  }
                } else {
                  // Add new item
                  ;(current[finalKey] as Array<unknown>).push({
                    id: crypto.randomUUID(),
                    value: update.new_value,
                    weight: 0.6,
                    source: "conversation",
                    created_at: new Date().toISOString(),
                  })
                }
              } else {
                current[finalKey] = update.new_value
              }
            } else if (update.action === "remove") {
              if (Array.isArray(current[finalKey])) {
                current[finalKey] = (
                  current[finalKey] as Array<{ value?: string } | string>
                ).filter(
                  (item) =>
                    (typeof item === "string" && item !== update.old_value) ||
                    (typeof item === "object" &&
                      item.value !== update.old_value)
                )
              } else {
                delete current[finalKey]
              }
            }
          }

          // Save updated manifest
          await supabase
            .from("soul_manifests")
            .update({
              manifest: updatedManifest,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id)

          manifestUpdate = extraction.summary
          console.log("[Reply] Manifest updated:", extraction.summary)
        }
      }
    } catch (extractionError) {
      console.error("[Reply] Manifest extraction failed:", extractionError)
      // Continue without manifest update
    }

    // Store the conversation (optional - for future reference)
    // Could add a conversations table to track these

    return NextResponse.json({
      response: response.trim(),
      manifestUpdate,
    })
  } catch (error) {
    console.error("[Reply] Error:", error)
    return NextResponse.json(
      { error: "Failed to process reply" },
      { status: 500 }
    )
  }
}
