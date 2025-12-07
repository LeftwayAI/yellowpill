// Soul Summary Generation
// Creates rich narrative summaries that incorporate META observations
// v1.1: Now uses raw inputs, voice profile, and meta observations

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

// Convert manifest to a RICH text representation for the prompt
// Now includes raw inputs, META observations, and voice profile
function manifestToText(manifest: SoulManifest): string {
  const sections: string[] = [];

  // ===========================================
  // RAW INPUTS (Their actual words - most important!)
  // ===========================================
  if (manifest.raw_inputs) {
    const rawSections: string[] = [];
    if (manifest.raw_inputs.passions_raw) {
      rawSections.push(`[PASSIONS - their words]: "${manifest.raw_inputs.passions_raw}"`);
    }
    if (manifest.raw_inputs.future_raw) {
      rawSections.push(`[FUTURE VISION - their words]: "${manifest.raw_inputs.future_raw}"`);
    }
    if (manifest.raw_inputs.fears_raw) {
      rawSections.push(`[FEARS - their words]: "${manifest.raw_inputs.fears_raw}"`);
    }
    if (manifest.raw_inputs.challenges_raw) {
      rawSections.push(`[CHALLENGES - their words]: "${manifest.raw_inputs.challenges_raw}"`);
    }
    if (manifest.raw_inputs.interests_raw) {
      rawSections.push(`[INTERESTS - their words]: "${manifest.raw_inputs.interests_raw}"`);
    }
    if (rawSections.length > 0) {
      sections.push("=== RAW INPUTS (verbatim) ===\n" + rawSections.join("\n\n"));
    }
  }

  // ===========================================
  // META OBSERVATIONS (AI analysis)
  // ===========================================
  if (manifest.meta) {
    const metaSections: string[] = [];
    
    // Voice signature
    if (manifest.meta.voice_signature) {
      const v = manifest.meta.voice_signature;
      metaSections.push(`Voice: ${v.tone}. ${v.sentence_style}. ${v.vocabulary_level}.`);
      if (v.notable_patterns?.length) {
        metaSections.push(`Writing patterns: ${v.notable_patterns.join("; ")}`);
      }
    }

    // Key tensions (this is gold for content)
    if (manifest.meta.tensions?.length) {
      const tensionText = manifest.meta.tensions.map(t => 
        `• ${t.tension} (${t.poles[0]} vs ${t.poles[1]})`
      ).join("\n");
      metaSections.push(`KEY TENSIONS:\n${tensionText}`);
    }

    // Motivational drivers
    if (manifest.meta.motivational_drivers?.length) {
      const primary = manifest.meta.motivational_drivers.filter(d => d.strength === "primary").map(d => d.driver);
      const secondary = manifest.meta.motivational_drivers.filter(d => d.strength === "secondary").map(d => d.driver);
      metaSections.push(`Driven by: ${primary.join(", ")}${secondary.length ? ` (also: ${secondary.join(", ")})` : ""}`);
    }

    // Weighted themes
    if (manifest.meta.weighted_themes?.length) {
      const highWeight = manifest.meta.weighted_themes.filter(t => t.weight === "high").map(t => t.theme);
      if (highWeight.length) {
        metaSections.push(`High emotional weight: ${highWeight.join(", ")}`);
      }
    }

    // Standout elements
    if (manifest.meta.standout_elements?.length) {
      const standouts = manifest.meta.standout_elements.map(s => 
        `• "${s.source_quote}" → ${s.observation}`
      ).join("\n");
      metaSections.push(`STANDOUT OBSERVATIONS:\n${standouts}`);
    }

    // Life phase
    if (manifest.meta.life_phase_analysis) {
      const lp = manifest.meta.life_phase_analysis;
      metaSections.push(`Life phase: ${lp.current_phase}${lp.time_pressure_felt ? " (feeling time pressure)" : ""}`);
      if (lp.key_decisions_pending?.length) {
        metaSections.push(`Pending decisions: ${lp.key_decisions_pending.join(", ")}`);
      }
    }

    if (metaSections.length > 0) {
      sections.push("=== META OBSERVATIONS ===\n" + metaSections.join("\n"));
    }
  }

  // ===========================================
  // VOICE PROFILE (how to write for them)
  // ===========================================
  if (manifest.voice_profile) {
    const vp = manifest.voice_profile;
    const voiceSections: string[] = [];
    voiceSections.push(`Communication style: ${vp.preferred_directness}, ${vp.challenge_tolerance} challenge tolerance`);
    if (vp.responds_to?.length) {
      voiceSections.push(`Responds to: ${vp.responds_to.join(", ")}`);
    }
    if (vp.turned_off_by?.length) {
      voiceSections.push(`AVOID: ${vp.turned_off_by.join(", ")}`);
    }
    if (vp.style_notes) {
      voiceSections.push(`Style notes: ${vp.style_notes}`);
    }
    sections.push("=== VOICE PROFILE ===\n" + voiceSections.join("\n"));
  }

  // ===========================================
  // STRUCTURED DATA (parsed items)
  // ===========================================
  const structuredSections: string[] = [];

  // Identity
  if (manifest.identity) {
    if (manifest.identity.name) {
      structuredSections.push(`Name: ${manifest.identity.name}`);
    }
    if (manifest.identity.passions?.length) {
      structuredSections.push(`Passions: ${manifest.identity.passions.map(p => p.value).join(", ")}`);
    }
    if (manifest.identity.values?.length) {
      structuredSections.push(`Values: ${manifest.identity.values.map(v => v.value).join(", ")}`);
    }
    if (manifest.identity.superpowers?.length) {
      structuredSections.push(`Superpowers: ${manifest.identity.superpowers.map(s => s.value).join(", ")}`);
    }
  }

  // Interests
  if (manifest.interests?.topics?.length) {
    const obsessed = manifest.interests.topics.filter(t => t.fascination_type === "obsessed_with").map(t => t.topic);
    const curious = manifest.interests.topics.filter(t => t.fascination_type !== "obsessed_with").map(t => t.topic);
    if (obsessed.length) structuredSections.push(`Obsessed with: ${obsessed.join(", ")}`);
    if (curious.length) structuredSections.push(`Curious about: ${curious.join(", ")}`);
    if (manifest.interests.people_who_fascinate?.length) {
      structuredSections.push(`People who fascinate: ${manifest.interests.people_who_fascinate.join(", ")}`);
    }
  }

  // Life Context
  if (manifest.life_context) {
    if (manifest.life_context.current_location) {
      const loc = manifest.life_context.current_location;
      structuredSections.push(`Location: ${loc.neighborhood ? loc.neighborhood + ", " : ""}${loc.city}, ${loc.country}`);
    }
    if (manifest.life_context.eras?.length) {
      const erasText = manifest.life_context.eras.map(e => 
        `${e.name} (${e.time_period}, ${e.location}): ${e.description}`
      ).join("\n");
      structuredSections.push(`Life eras:\n${erasText}`);
    }
  }

  // Growth
  if (manifest.growth) {
    if (manifest.growth.current_challenges?.length) {
      structuredSections.push(`Challenges: ${manifest.growth.current_challenges.map(c => c.value).join(", ")}`);
    }
    if (manifest.growth.fears?.length) {
      structuredSections.push(`Fears: ${manifest.growth.fears.map(f => f.value).join(", ")}`);
    }
  }

  // Dreams
  if (manifest.dreams) {
    if (manifest.dreams.vivid_future_scenes?.length) {
      structuredSections.push(`Future visions: ${manifest.dreams.vivid_future_scenes.map(d => d.value).join("; ")}`);
    }
    if (manifest.dreams.fantasy_selves?.length) {
      structuredSections.push(`Fantasy selves: ${manifest.dreams.fantasy_selves.map(f => f.value).join(", ")}`);
    }
  }

  // Creative
  if (manifest.creative?.creative_outlets?.length) {
    structuredSections.push(`Creative outlets: ${manifest.creative.creative_outlets.join(", ")}`);
  }

  if (structuredSections.length > 0) {
    sections.push("=== STRUCTURED DATA ===\n" + structuredSections.join("\n"));
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

EXTRAPOLATION RULE:
When describing their dreams/goals/future, don't just restate what they said — extrapolate what it MEANS at scale. If they want a smart home, that suggests a fascination with living in the future; if they want to write, that's a desire to shape minds. Include the IMPLICATIONS of what they want, not just the surface level. Think: "What does this look like if everything goes extraordinarily well for them?"

BAD: "They're on a journey of self-discovery, navigating the tension between stability and adventure."
GOOD: "34, Brooklyn. Writes code by day, poetry no one sees. Married 3 years, no kids, terrified that decision was wrong. Dreams of a cabin in Vermont but won't leave the city."
GOOD (extrapolated): "Wants a smart home — really wants to live in the future before anyone else. Building toward a life where technology handles the friction so they can focus on what matters."

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

