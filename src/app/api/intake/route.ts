import { createClient } from "@/lib/supabase/server"
import { grokStructuredOutput } from "@/lib/grok"
import { NextResponse } from "next/server"
import {
  createEmptyManifest,
  createManifestItem,
  type SoulManifest,
  type LocationItem,
  type EraItem,
  type MetaObservations,
  type VoiceProfile,
  type InterestItem,
} from "@/types/manifest"

// Schema for Grok to parse intake answers into manifest structure
const MANIFEST_PARSE_SCHEMA = {
  type: "object",
  properties: {
    identity: {
      type: "object",
      properties: {
        name: { type: "string" },
        passions: {
          type: "array",
          items: { type: "string" },
          description: "List of passions extracted from their answer",
        },
        superpowers: {
          type: "array",
          items: { type: "string" },
          description: "List of superpowers/strengths",
        },
        values: {
          type: "array",
          items: { type: "string" },
          description: "List of core values",
        },
      },
      required: ["passions", "superpowers", "values"],
    },
    interests: {
      type: "object",
      properties: {
        topics: {
          type: "array",
          items: {
            type: "object",
            properties: {
              topic: { type: "string" },
              fascination_type: {
                type: "string",
                enum: [
                  "curious_about",
                  "obsessed_with",
                  "want_to_learn",
                  "love_reading_about",
                ],
              },
              subtopics: { type: "array", items: { type: "string" } },
            },
            required: ["topic", "fascination_type"],
          },
          description: "Topics and areas they're fascinated by",
        },
        people_who_fascinate: {
          type: "array",
          items: { type: "string" },
          description: "People they find fascinating (can include why)",
        },
      },
      required: ["topics"],
    },
    life_context: {
      type: "object",
      properties: {
        current_location: {
          type: "object",
          properties: {
            city: { type: "string" },
            neighborhood: { type: "string" },
            country: { type: "string" },
          },
          required: ["city", "country"],
        },
        life_story_summary: { type: "string" },
        eras: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              time_period: { type: "string" },
              location: { type: "string" },
              description: { type: "string" },
            },
            required: ["name", "description"],
          },
        },
      },
      required: ["current_location", "life_story_summary", "eras"],
    },
    growth: {
      type: "object",
      properties: {
        current_challenges: {
          type: "array",
          items: { type: "string" },
        },
        fears: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["current_challenges", "fears"],
    },
    dreams: {
      type: "object",
      properties: {
        vivid_future_scenes: {
          type: "array",
          items: { type: "string" },
          description: "Vivid, specific scenes from their ideal future",
        },
        fantasy_selves: {
          type: "array",
          items: { type: "string" },
          description: "Who they want to become (e.g., 'novelist', 'founder')",
        },
      },
      required: ["vivid_future_scenes"],
    },
  },
  required: ["identity", "interests", "life_context", "growth", "dreams"],
  additionalProperties: false,
}

// Schema for META observations - deep analysis of the raw text
const META_OBSERVATIONS_SCHEMA = {
  type: "object",
  properties: {
    voice_signature: {
      type: "object",
      properties: {
        tone: {
          type: "string",
          description:
            "Overall tone of their writing (e.g., 'direct, optimistic, slightly impatient')",
        },
        sentence_style: {
          type: "string",
          description: "How they construct sentences",
        },
        vocabulary_level: {
          type: "string",
          description: "Casual, precise, elevated, etc.",
        },
        notable_patterns: {
          type: "array",
          items: { type: "string" },
          description: "Specific quirks in how they write",
        },
      },
      required: [
        "tone",
        "sentence_style",
        "vocabulary_level",
        "notable_patterns",
      ],
    },
    standout_elements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          observation: { type: "string" },
          why_significant: { type: "string" },
          source_quote: {
            type: "string",
            description: "Their exact words that led to this observation",
          },
        },
        required: ["observation", "why_significant", "source_quote"],
      },
      description:
        "Things that stand out as particularly significant or revealing",
    },
    tensions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          tension: {
            type: "string",
            description: "The contradiction or tension identified",
          },
          poles: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 2,
          },
          source_evidence: { type: "string" },
        },
        required: ["tension", "poles", "source_evidence"],
      },
      description: "Contradictions and internal tensions worth exploring",
    },
    motivational_drivers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          driver: {
            type: "string",
            description:
              "What motivates them: autonomy, recognition, impact, mastery, security, connection, novelty",
          },
          strength: { type: "string", enum: ["primary", "secondary"] },
          evidence: { type: "string" },
        },
        required: ["driver", "strength", "evidence"],
      },
    },
    weighted_themes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          theme: { type: "string" },
          weight: { type: "string", enum: ["high", "medium"] },
          reasoning: { type: "string" },
        },
        required: ["theme", "weight", "reasoning"],
      },
      description: "Themes that carry extra emotional weight for this person",
    },
    life_phase_analysis: {
      type: "object",
      properties: {
        current_phase: {
          type: "string",
          description: "Describe their life phase with specificity",
        },
        key_decisions_pending: { type: "array", items: { type: "string" } },
        time_pressure_felt: { type: "boolean" },
      },
      required: [
        "current_phase",
        "key_decisions_pending",
        "time_pressure_felt",
      ],
    },
  },
  required: [
    "voice_signature",
    "standout_elements",
    "tensions",
    "motivational_drivers",
    "weighted_themes",
    "life_phase_analysis",
  ],
  additionalProperties: false,
}

// Schema for voice profile - how to communicate with this person
const VOICE_PROFILE_SCHEMA = {
  type: "object",
  properties: {
    preferred_directness: {
      type: "string",
      enum: ["very_direct", "direct", "gentle", "very_gentle"],
    },
    humor_tolerance: { type: "string", enum: ["high", "medium", "low"] },
    challenge_tolerance: {
      type: "string",
      enum: ["loves_it", "moderate", "sensitive"],
    },
    responds_to: {
      type: "array",
      items: { type: "string" },
      description: "What kinds of content/approaches resonate",
    },
    turned_off_by: {
      type: "array",
      items: { type: "string" },
      description: "What to avoid",
    },
    style_notes: {
      type: "string",
      description: "Freeform notes on how to write for this person",
    },
  },
  required: [
    "preferred_directness",
    "humor_tolerance",
    "challenge_tolerance",
    "responds_to",
    "turned_off_by",
    "style_notes",
  ],
  additionalProperties: false,
}

interface ParsedManifest {
  identity: {
    name?: string
    passions: string[]
    superpowers: string[]
    values: string[]
  }
  interests: {
    topics: Array<{
      topic: string
      fascination_type:
        | "curious_about"
        | "obsessed_with"
        | "want_to_learn"
        | "love_reading_about"
      subtopics?: string[]
    }>
    people_who_fascinate?: string[]
  }
  life_context: {
    current_location: {
      city: string
      neighborhood?: string
      country: string
    }
    life_story_summary: string
    eras: Array<{
      name: string
      time_period?: string
      location?: string
      description: string
    }>
  }
  growth: {
    current_challenges: string[]
    fears: string[]
  }
  dreams: {
    vivid_future_scenes: string[]
    fantasy_selves?: string[]
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { answers } = await request.json()

    // ===========================================
    // Step 0: Extract X profile data if present
    // ===========================================
    const xProfile = answers._xProfile as
      | {
          username?: string
          name?: string
          bio?: string
          location?: string
        }
      | undefined

    const xInferred = answers._inferred as
      | {
          likely_passions?: string[]
          likely_work?: string
          tone_and_voice?: string
          possible_values?: string[]
          life_phase_guess?: string
        }
      | undefined

    // ===========================================
    // Step 1: Preserve raw inputs VERBATIM
    // ===========================================
    const rawInputs = {
      passions_raw: answers.passions || "",
      future_raw: answers.future || "",
      superpowers_raw: answers.superpowers || "",
      challenges_raw: answers.challenges || "",
      fears_raw: answers.fears || "",
      values_raw: answers.values || "",
      purpose_raw: answers.purpose || "",
      life_story_raw: answers.life_story || "",
      interests_raw: answers.interests || "",
      birthday: answers.birthday || "",
      // X profile data (preserved for context)
      x_bio: xProfile?.bio || "",
      x_username: xProfile?.username || "",
    }

    // Build combined raw text for meta analysis
    // Include X profile data if available for richer context
    const xProfileSection =
      xProfile?.bio || xInferred
        ? `
=== FROM THEIR X (TWITTER) PROFILE ===
${xProfile?.username ? `Username: @${xProfile.username}` : ""}
${xProfile?.bio ? `Bio: ${xProfile.bio}` : ""}
${xInferred?.likely_work ? `Likely work: ${xInferred.likely_work}` : ""}
${
  xInferred?.tone_and_voice
    ? `Their tone/voice online: ${xInferred.tone_and_voice}`
    : ""
}
${
  xInferred?.likely_passions?.length
    ? `Apparent passions: ${xInferred.likely_passions.join(", ")}`
    : ""
}
${
  xInferred?.possible_values?.length
    ? `Values signaled: ${xInferred.possible_values.join(", ")}`
    : ""
}
${
  xInferred?.life_phase_guess ? `Life phase: ${xInferred.life_phase_guess}` : ""
}
=== END X PROFILE ===" : ""
`.trim()
        : ""

    const allRawText = `
NAME: ${answers.name || "Not provided"}
BIRTHDAY: ${answers.birthday || "Not provided"}
${xProfileSection}

PASSIONS (what makes them lose track of time):
${answers.passions || "Not provided"}

IDEAL FUTURE IN 5 YEARS:
${answers.future || "Not provided"}

SUPERPOWERS (what they're good at):
${answers.superpowers || "Not provided"}

CURRENT CHALLENGES:
${answers.challenges || "Not provided"}

FEARS:
${answers.fears || "Not provided"}

CORE VALUES:
${answers.values || "Not provided"}

PURPOSE (what they believe they were born to do):
${answers.purpose || "Not provided / still figuring it out"}

INTERESTS & OBSESSIONS (topics they're fascinated by):
${answers.interests || "Not provided"}

LOCATION:
${answers.location || "Not provided"}

LIFE STORY:
${answers.life_story || "Not provided"}
`.trim()

    // ===========================================
    // Step 2: Parse into structured manifest
    // ===========================================
    const parsePrompt = `You are parsing onboarding answers to build a structured Soul Manifest.

The user provided these answers during onboarding:

${allRawText}

Parse these into a structured manifest:
- For arrays, extract distinct items
- For the life story, identify major eras/phases
- For future scenes, extract vivid, specific visualizations
- For interests, categorize by how intensely they care about each topic
- Be thorough but concise
- Preserve the ENERGY and specificity of their words where possible`

    const parsed = await grokStructuredOutput<ParsedManifest>(
      [{ role: "user", content: parsePrompt }],
      "manifest_parse",
      MANIFEST_PARSE_SCHEMA,
      { temperature: 0.3 }
    )

    // ===========================================
    // Step 3: Generate META observations (parallel with voice profile)
    // ===========================================
    const metaPrompt = `Analyze this person's onboarding answers deeply. Look beyond what they say to HOW they say it.

Their raw answers:
${allRawText}

Your job is to extract META observations:
1. VOICE SIGNATURE: How do they write? What's their tone, sentence style, vocabulary? What patterns are notable?
2. STANDOUT ELEMENTS: What jumps out? Quote their exact words that reveal something significant.
3. TENSIONS: What contradictions exist? (e.g., "good at inspiring others" + "struggle to believe in self")
4. MOTIVATIONAL DRIVERS: What ACTUALLY drives them? (autonomy, recognition, impact, mastery, security, connection, novelty)
5. WEIGHTED THEMES: What carries extra emotional weight? What do they care about MORE than they might admit?
6. LIFE PHASE: Where are they in life? What decisions loom? Do they feel time pressure?

Be specific. Quote their words. Find the interesting stuff.`

    const voiceProfilePrompt = `Based on this person's writing style and what they've shared, determine how content should be written FOR them.

Their raw answers:
${allRawText}

Determine:
1. DIRECTNESS: Based on how they write, do they prefer very direct, direct, gentle, or very gentle communication?
2. HUMOR: High, medium, or low tolerance for humor/playfulness in content?
3. CHALLENGE: Do they love being challenged, are they moderate, or sensitive to it?
4. RESPONDS TO: What kinds of content/approaches will resonate? (e.g., "specificity", "future-casting", "reframes", "questions")
5. TURNED OFF BY: What to avoid? (e.g., "generic advice", "toxic positivity", "preachy tone")
6. STYLE NOTES: Freeform notes on how to write for this person specifically.

Be specific to THIS person based on their actual writing.`

    // Run meta observations and voice profile in parallel
    const [metaObservations, voiceProfile] = await Promise.all([
      grokStructuredOutput<MetaObservations>(
        [{ role: "user", content: metaPrompt }],
        "meta_observations",
        META_OBSERVATIONS_SCHEMA,
        { temperature: 0.5 }
      ),
      grokStructuredOutput<VoiceProfile>(
        [{ role: "user", content: voiceProfilePrompt }],
        "voice_profile",
        VOICE_PROFILE_SCHEMA,
        { temperature: 0.4 }
      ),
    ])

    // ===========================================
    // Step 4: Build the full manifest
    // ===========================================
    const manifest = createEmptyManifest(user.id)

    // Raw inputs (preserved verbatim)
    manifest.raw_inputs = rawInputs

    // META observations
    manifest.meta = metaObservations

    // Voice profile
    manifest.voice_profile = voiceProfile

    // Identity
    manifest.identity.name = parsed.identity.name || answers.name
    manifest.identity.passions = parsed.identity.passions.map((p) =>
      createManifestItem(p, "onboarding")
    )
    manifest.identity.superpowers = parsed.identity.superpowers.map((s) =>
      createManifestItem(s, "onboarding")
    )
    manifest.identity.values = parsed.identity.values.map((v) =>
      createManifestItem(v, "onboarding")
    )
    // Purpose (if provided)
    if (answers.purpose && answers.purpose.trim()) {
      manifest.identity.purpose = [
        createManifestItem(answers.purpose, "onboarding"),
      ]
    }

    // Temporal (birthday)
    if (answers.birthday) {
      manifest.temporal = {
        birthday: answers.birthday,
      }
    }

    // Interests
    manifest.interests = {
      topics: parsed.interests.topics.map((t) => ({
        id: crypto.randomUUID(),
        topic: t.topic,
        fascination_type: t.fascination_type,
        subtopics: t.subtopics,
        weight: t.fascination_type === "obsessed_with" ? 0.9 : 0.7,
        source: "onboarding" as const,
        created_at: new Date().toISOString(),
      })),
      people_who_fascinate: parsed.interests.people_who_fascinate,
    }

    // Life Context
    manifest.life_context.current_location = {
      city: parsed.life_context.current_location.city,
      neighborhood: parsed.life_context.current_location.neighborhood,
      country: parsed.life_context.current_location.country,
    } as LocationItem

    manifest.life_context.life_story_summary = createManifestItem(
      parsed.life_context.life_story_summary,
      "onboarding"
    )

    manifest.life_context.eras = parsed.life_context.eras.map((era) => ({
      id: crypto.randomUUID(),
      name: era.name,
      time_period: era.time_period || "",
      location: era.location || "",
      description: era.description,
      weight: 0.7,
    })) as EraItem[]

    // Growth
    manifest.growth.current_challenges = parsed.growth.current_challenges.map(
      (c) => createManifestItem(c, "onboarding")
    )
    manifest.growth.fears = parsed.growth.fears.map((f) =>
      createManifestItem(f, "onboarding")
    )
    manifest.growth.goals_short_term = []
    manifest.growth.goals_long_term = []

    // Dreams
    manifest.dreams.vivid_future_scenes = parsed.dreams.vivid_future_scenes.map(
      (s) => createManifestItem(s, "onboarding")
    )
    manifest.dreams.fantasy_selves = (parsed.dreams.fantasy_selves || []).map(
      (f) => createManifestItem(f, "onboarding")
    )

    // Save to database - cast manifest to JSON type
    const { error: insertError } = await supabase
      .from("soul_manifests")
      .insert({
        user_id: user.id,
        manifest: manifest as unknown as Record<string, unknown>,
        schema_version: "1.0",
      })

    if (insertError) {
      console.error("Insert error:", insertError)
      return NextResponse.json(
        { error: "Failed to save manifest" },
        { status: 500 }
      )
    }

    // Generate initial posts
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000")

    await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Intake error:", error)
    return NextResponse.json(
      { error: "Failed to process intake" },
      { status: 500 }
    )
  }
}
