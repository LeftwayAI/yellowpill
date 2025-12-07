import { createClient } from "@/lib/supabase/server";
import { grokStructuredOutput } from "@/lib/grok";
import { NextResponse } from "next/server";
import {
  createEmptyManifest,
  createManifestItem,
  type SoulManifest,
  type LocationItem,
  type EraItem,
} from "@/types/manifest";

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
  required: ["identity", "life_context", "growth", "dreams"],
  additionalProperties: false,
};

interface ParsedManifest {
  identity: {
    name?: string;
    passions: string[];
    superpowers: string[];
    values: string[];
  };
  life_context: {
    current_location: {
      city: string;
      neighborhood?: string;
      country: string;
    };
    life_story_summary: string;
    eras: Array<{
      name: string;
      time_period?: string;
      location?: string;
      description: string;
    }>;
  };
  growth: {
    current_challenges: string[];
    fears: string[];
  };
  dreams: {
    vivid_future_scenes: string[];
    fantasy_selves?: string[];
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { answers } = await request.json();

    // Build prompt for Grok to parse the answers
    const parsePrompt = `You are parsing onboarding answers to build a structured Soul Manifest.

The user provided these answers during onboarding:

Name: ${answers.name}

Passions (what makes them lose track of time): ${answers.passions}

Ideal future in 5 years: ${answers.future}

Superpowers (what they're good at): ${answers.superpowers}

Current challenges: ${answers.challenges}

Fears: ${answers.fears}

Core values: ${answers.values}

Location: ${answers.location}

Life story: ${answers.life_story}

Parse these into a structured manifest. For arrays, extract distinct items. For the life story, identify major eras/phases. For future scenes, extract vivid, specific visualizations. Be thorough but concise.`;

    // Call Grok with structured output
    const parsed = await grokStructuredOutput<ParsedManifest>(
      [{ role: "user", content: parsePrompt }],
      "manifest_parse",
      MANIFEST_PARSE_SCHEMA,
      { temperature: 0.3 }
    );

    // Build the full manifest
    const manifest = createEmptyManifest(user.id);

    // Identity
    manifest.identity.name = parsed.identity.name || answers.name;
    manifest.identity.passions = parsed.identity.passions.map((p) =>
      createManifestItem(p, "onboarding")
    );
    manifest.identity.superpowers = parsed.identity.superpowers.map((s) =>
      createManifestItem(s, "onboarding")
    );
    manifest.identity.values = parsed.identity.values.map((v) =>
      createManifestItem(v, "onboarding")
    );

    // Life Context
    manifest.life_context.current_location = {
      city: parsed.life_context.current_location.city,
      neighborhood: parsed.life_context.current_location.neighborhood,
      country: parsed.life_context.current_location.country,
    } as LocationItem;

    manifest.life_context.life_story_summary = createManifestItem(
      parsed.life_context.life_story_summary,
      "onboarding"
    );

    manifest.life_context.eras = parsed.life_context.eras.map((era) => ({
      id: crypto.randomUUID(),
      name: era.name,
      time_period: era.time_period || "",
      location: era.location || "",
      description: era.description,
      weight: 0.7,
    })) as EraItem[];

    // Growth
    manifest.growth.current_challenges = parsed.growth.current_challenges.map(
      (c) => createManifestItem(c, "onboarding")
    );
    manifest.growth.fears = parsed.growth.fears.map((f) =>
      createManifestItem(f, "onboarding")
    );
    manifest.growth.goals_short_term = [];
    manifest.growth.goals_long_term = [];

    // Dreams
    manifest.dreams.vivid_future_scenes = parsed.dreams.vivid_future_scenes.map(
      (s) => createManifestItem(s, "onboarding")
    );
    manifest.dreams.fantasy_selves = (parsed.dreams.fantasy_selves || []).map(
      (f) => createManifestItem(f, "onboarding")
    );

    // Save to database - cast manifest to JSON type
    const { error: insertError } = await supabase.from("soul_manifests").insert({
      user_id: user.id,
      manifest: manifest as unknown as Record<string, unknown>,
      schema_version: "1.0",
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save manifest" },
        { status: 500 }
      );
    }

    // Generate initial posts
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    
    await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Intake error:", error);
    return NextResponse.json(
      { error: "Failed to process intake" },
      { status: 500 }
    );
  }
}
