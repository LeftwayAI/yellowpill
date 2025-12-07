// Soul Summary Generation
// Creates multiple narrative summaries of a user from different angles

import { grokChat, GROK_MODELS } from "./grok";
import type { SoulManifest } from "@/types/manifest";

// The different angles/lenses for viewing someone's soul
export const SOUL_ANGLES = {
  builder: {
    id: "builder",
    name: "The Builder",
    focus: "making, creating, craftsmanship, what they build and why",
  },
  seeker: {
    id: "seeker", 
    name: "The Seeker",
    focus: "growth, fears, searching, the tensions they navigate",
  },
  dreamer: {
    id: "dreamer",
    name: "The Dreamer", 
    focus: "future visions, aspirations, who they want to become",
  },
  chronicler: {
    id: "chronicler",
    name: "The Chronicler",
    focus: "life story, journey, eras, how they got here",
  },
} as const;

export type SoulAngle = keyof typeof SOUL_ANGLES;

export interface SoulSummaries {
  generated_at: string;
  summaries: Record<SoulAngle, string>;
}

// Convert manifest to a flat text representation for the prompt
function manifestToText(manifest: SoulManifest): string {
  const sections: string[] = [];

  // Identity
  if (manifest.identity) {
    if (manifest.identity.name) {
      sections.push(`Name: ${manifest.identity.name}`);
    }
    if (manifest.identity.passions?.length) {
      sections.push(`Passions: ${manifest.identity.passions.map(p => p.value).join(", ")}`);
    }
    if (manifest.identity.values?.length) {
      sections.push(`Values: ${manifest.identity.values.map(v => v.value).join(", ")}`);
    }
    if (manifest.identity.superpowers?.length) {
      sections.push(`Superpowers: ${manifest.identity.superpowers.map(s => s.value).join(", ")}`);
    }
  }

  // Life Context
  if (manifest.life_context) {
    if (manifest.life_context.current_location) {
      const loc = manifest.life_context.current_location;
      sections.push(`Current location: ${loc.neighborhood ? loc.neighborhood + ", " : ""}${loc.city}, ${loc.country}`);
    }
    if (manifest.life_context.places_lived?.length) {
      sections.push(`Places lived: ${manifest.life_context.places_lived.map(p => p.city).join(" → ")}`);
    }
    if (manifest.life_context.eras?.length) {
      const erasText = manifest.life_context.eras.map(e => 
        `${e.name} (${e.time_period}, ${e.location}): ${e.description}`
      ).join("\n");
      sections.push(`Life eras:\n${erasText}`);
    }
    if (manifest.life_context.life_story_summary?.value) {
      sections.push(`Life story: ${manifest.life_context.life_story_summary.value}`);
    }
  }

  // Growth
  if (manifest.growth) {
    if (manifest.growth.current_challenges?.length) {
      sections.push(`Current challenges: ${manifest.growth.current_challenges.map(c => c.value).join(", ")}`);
    }
    if (manifest.growth.fears?.length) {
      sections.push(`Fears: ${manifest.growth.fears.map(f => f.value).join(", ")}`);
    }
    if (manifest.growth.goals_short_term?.length) {
      sections.push(`Short-term goals: ${manifest.growth.goals_short_term.map(g => g.value).join(", ")}`);
    }
    if (manifest.growth.goals_long_term?.length) {
      sections.push(`Long-term goals: ${manifest.growth.goals_long_term.map(g => g.value).join(", ")}`);
    }
  }

  // Dreams
  if (manifest.dreams) {
    if (manifest.dreams.vivid_future_scenes?.length) {
      sections.push(`Future visions: ${manifest.dreams.vivid_future_scenes.map(d => d.value).join("; ")}`);
    }
    if (manifest.dreams.fantasy_selves?.length) {
      sections.push(`Fantasy selves: ${manifest.dreams.fantasy_selves.map(f => f.value).join(", ")}`);
    }
  }

  // Worldview
  if (manifest.worldview) {
    if (manifest.worldview.core_beliefs?.length) {
      sections.push(`Core beliefs: ${manifest.worldview.core_beliefs.map(b => b.value).join(", ")}`);
    }
    if (manifest.worldview.questions_wrestling_with?.length) {
      sections.push(`Questions wrestling with: ${manifest.worldview.questions_wrestling_with.map(q => q.value).join(", ")}`);
    }
  }

  // Creative
  if (manifest.creative) {
    if (manifest.creative.creative_outlets?.length) {
      sections.push(`Creative outlets: ${manifest.creative.creative_outlets.join(", ")}`);
    }
  }

  // Relationships
  if (manifest.relationships) {
    if (manifest.relationships.important_people?.length) {
      sections.push(`Important people: ${manifest.relationships.important_people.map(p => p.relation).join(", ")}`);
    }
  }

  return sections.join("\n\n");
}

// Generate a single soul summary from a specific angle
async function generateSummaryForAngle(
  manifest: SoulManifest,
  angle: SoulAngle
): Promise<string> {
  const angleConfig = SOUL_ANGLES[angle];
  const manifestText = manifestToText(manifest);

  const systemPrompt = `You are creating a hyper-condensed psychological profile. Think: clinical notes meets poetry. Dense with specifics, zero filler.

Your task: Write a 100-150 word summary from the "${angleConfig.name}" angle.

Focus: ${angleConfig.focus}

STYLE RULES:
- Third person ("They..." not "You...")
- DENSE. Every sentence carries weight. No fluff.
- Specifics over abstractions. "Software engineer pivoting to design at 34" not "creative professional in transition"
- Include contradictions and tensions — these are the interesting parts
- No inspirational language. No "journey" or "discovering themselves"
- Write like case notes, not a magazine profile
- If something is vague in the data, don't invent — skip it

BAD: "They're on a journey of self-discovery, navigating the tension between stability and adventure."
GOOD: "34, Brooklyn. Writes code by day, poetry no one sees. Married 3 years, no kids, terrified that decision was wrong. Dreams of a cabin in Vermont but won't leave the city."

Be RUTHLESSLY specific. If you don't have the data, don't pad.`;

  const prompt = `Raw data:

${manifestText}

Write the "${angleConfig.name}" summary. Dense, specific, no filler.`;

  const summary = await grokChat(
    systemPrompt,
    [{ role: "user", content: prompt }],
    { 
      model: GROK_MODELS.GROK_4_FAST_REASONING,
      temperature: 0.5, // Lower for more focused output
      max_tokens: 400 
    }
  );

  return summary.trim();
}

// Generate all soul summaries for a manifest
export async function generateSoulSummaries(
  manifest: SoulManifest
): Promise<SoulSummaries> {
  console.log("Generating soul summaries for all angles...");
  
  // Generate all angles in parallel
  const angles = Object.keys(SOUL_ANGLES) as SoulAngle[];
  const summaryPromises = angles.map(angle => 
    generateSummaryForAngle(manifest, angle)
  );
  
  const summaryResults = await Promise.all(summaryPromises);
  
  const summaries: Record<SoulAngle, string> = {} as Record<SoulAngle, string>;
  angles.forEach((angle, index) => {
    summaries[angle] = summaryResults[index];
  });

  return {
    generated_at: new Date().toISOString(),
    summaries,
  };
}

// Get a random soul summary for generation context
export function getRandomSoulSummary(soulSummaries: SoulSummaries): {
  angle: SoulAngle;
  summary: string;
} {
  const angles = Object.keys(soulSummaries.summaries) as SoulAngle[];
  const randomAngle = angles[Math.floor(Math.random() * angles.length)];
  
  return {
    angle: randomAngle,
    summary: soulSummaries.summaries[randomAngle],
  };
}

