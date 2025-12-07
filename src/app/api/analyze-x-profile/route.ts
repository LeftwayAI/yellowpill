import { NextResponse } from "next/server";
import { grokChat, grokStructuredOutput, GROK_MODELS } from "@/lib/grok";

interface XProfile {
  username?: string;
  name?: string;
  bio?: string;
  location?: string;
  profileImage?: string;
}

interface ProfileAnalysis {
  // What we can infer
  inferred: {
    likely_passions: string[];
    likely_work: string;
    tone_and_voice: string;
    possible_values: string[];
    life_phase_guess: string;
  };
  // What we still need to know (gaps)
  gaps: {
    id: string;
    question: string;
    why_asking: string; // Internal reasoning, not shown to user
  }[];
  // Pre-populated fields for the manifest
  prefill: {
    name: string;
    location: string;
    passions_hint: string;
  };
}

export async function POST(request: Request) {
  try {
    const { xProfile }: { xProfile: XProfile } = await request.json();

    if (!xProfile || (!xProfile.bio && !xProfile.name)) {
      return NextResponse.json(
        { error: "No profile data to analyze" },
        { status: 400 }
      );
    }

    // Build profile text for analysis
    const profileText = [
      xProfile.name && `Name: ${xProfile.name}`,
      xProfile.username && `Username: @${xProfile.username}`,
      xProfile.bio && `Bio: ${xProfile.bio}`,
      xProfile.location && `Location: ${xProfile.location}`,
    ]
      .filter(Boolean)
      .join("\n");

    const systemPrompt = `You are analyzing a person's X (Twitter) profile to understand who they are. Your goal is to:

1. INFER what you can about them from their public persona
2. IDENTIFY what gaps remain — the things you can't know from a profile
3. GENERATE 3-4 targeted questions that would reveal the most about their inner life

The questions should:
- NOT be things you could find on their profile
- Get at fears, dreams, tensions, and what drives them
- Feel insightful, not generic
- Be specific enough to prompt real answers

Output JSON only.`;

    const analysisPrompt = `Here's their X profile:

${profileText}

Analyze this person and identify:
1. What you can reasonably infer (passions, work, values, life phase)
2. 3-4 specific questions to ask them that would reveal what their profile CAN'T tell you
3. Pre-fill data for their manifest (name, location)

Questions should feel like "ah, you really SEE me" not like a generic intake form.`;

    const schema = {
      type: "object",
      properties: {
        inferred: {
          type: "object",
          properties: {
            likely_passions: { type: "array", items: { type: "string" } },
            likely_work: { type: "string" },
            tone_and_voice: { type: "string" },
            possible_values: { type: "array", items: { type: "string" } },
            life_phase_guess: { type: "string" },
          },
          required: ["likely_passions", "likely_work", "tone_and_voice", "possible_values", "life_phase_guess"],
        },
        gaps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              question: { type: "string" },
              why_asking: { type: "string" },
            },
            required: ["id", "question", "why_asking"],
          },
        },
        prefill: {
          type: "object",
          properties: {
            name: { type: "string" },
            location: { type: "string" },
            passions_hint: { type: "string" },
          },
          required: ["name", "location", "passions_hint"],
        },
      },
      required: ["inferred", "gaps", "prefill"],
    };

    const analysis = await grokStructuredOutput<ProfileAnalysis>(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: analysisPrompt },
      ],
      "profile_analysis",
      schema,
      { model: GROK_MODELS.GROK_4_FAST_REASONING, temperature: 0.5 }
    );

    // Generate a "here's what I see" summary for the user
    const summaryPrompt = `Based on this profile analysis:

${JSON.stringify(analysis.inferred, null, 2)}

Write a 2-3 sentence summary of what you can tell about this person from their public profile. 

Tone: Observational, intrigued, like you're meeting someone interesting at a party and picking up on things. Not sycophantic.

Start with "From what I can see..." or similar. Be specific to THEIR profile, not generic.`;

    const summary = await grokChat(
      "You're greeting someone and showing them you've noticed who they are.",
      [{ role: "user", content: summaryPrompt }],
      { model: GROK_MODELS.GROK_4_FAST, temperature: 0.6, max_tokens: 200 }
    );

    return NextResponse.json({
      analysis,
      summary: summary.trim(),
    });
  } catch (error) {
    console.error("Profile analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze profile" },
      { status: 500 }
    );
  }
}

