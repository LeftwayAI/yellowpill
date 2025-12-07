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

The quote should feel unexpected — not the obvious choice.

FORMAT REQUIREMENTS - THIS IS EXTREMELY IMPORTANT:
- Start DIRECTLY with the opening quotation mark
- NO preamble whatsoever
- NO intro phrases like "On finding meaning:" or "About creativity:" or "Here's a quote about..."
- NO context-setting before the quote
- ONLY output: "The exact quote." — Author Name
- Nothing else. Just the quote and the author. That's it.

WRONG FORMAT:
On perseverance: "The quote..."

CORRECT FORMAT:
"The quote..."
— Author Name`,
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
      constraint: `CONSTRAINT: The scene MUST take place in ${season}, during ${time}, approximately ${yearsAhead} year${yearsAhead > 1 ? "s" : ""} from now.

=== THIS IS THE MOST IMPORTANT INSTRUCTION ===

DO NOT WRITE ABOUT WHAT THEY SAID THEY WANT. 

If they said they want to write a book → DO NOT mention books, writing, publishing, or authors
If they said they want financial freedom → DO NOT mention money, retirement, or "not having to work"
If they said they want to build a startup → DO NOT mention companies, investors, or exits

Instead, DAYDREAM about things that would make this specific person HAPPY based on who they are:

1. ADJACENT PLEASURES: What sensory experiences would they love? A specific type of morning? A view? A sound? A feeling?

2. CHARACTER-BASED MOMENTS: Based on their personality, what random scene would bring them deep satisfaction? If they're a tinkerer, maybe they're fixing something odd at a neighbor's house. If they're a connector, maybe a dinner table scene with unexpected guests.

3. QUIET SIGNALS OF ARRIVAL: What tiny mundane moment would only exist if everything went extraordinarily well? The specific coffee order they'd have time to make. The dog walk they'd never have to cut short. The nap they'd take without guilt.

4. EXPANDED POSSIBILITIES: Based on who they are, what life experiences might they stumble into that they never even thought to want? Travel to unexpected places? Hobbies they'd discover? People they'd meet?

The goal is to paint a scene that makes them think "Oh... I didn't know I wanted that, but yes." NOT "That's exactly what I told you I wanted."

EXAMPLES:
- User wants to be a writer → Scene: Teaching your nephew to skip rocks at a lakehouse you rented for the summer. The manuscript is done but you're not thinking about it.
- User wants financial freedom → Scene: A random Wednesday, 2pm, you're at a bookstore in a town you've never been to, no phone, nowhere to be.
- User wants to build something → Scene: A FaceTime call with your parents where they're asking for advice on THEIR side project. The roles have reversed.

Start with: "It's ${season}, ${new Date().getFullYear() + yearsAhead}. ${time.charAt(0).toUpperCase() + time.slice(1)}..."`,
    };
  }
  
  return null;
}

// The core generation prompt - designed to encourage natural ideation
// Key principles:
// 1. Use their RAW WORDS and TENSIONS as inspiration
// 2. Honor their VOICE PROFILE for tone and style
// 3. Find an angle that encourages or reframes positively  
// 4. Be specific enough to land, general enough to feel discovered
// 5. THINK BIGGER — extrapolate beyond what they said
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
You're writing for someone you deeply understand. The soul context below includes:
- Their RAW WORDS (preserve their energy, don't flatten)
- META OBSERVATIONS about their tensions, drivers, and emotional weight
- VOICE PROFILE for how to communicate with them
- Structured data about their life

KEY PRINCIPLES:
1. Draw from their TENSIONS — these are where resonant content lives
2. Honor their VOICE PROFILE — if they prefer directness, be direct; if they hate generic advice, avoid it
3. Use their raw words as INSPIRATION, not direct reference
4. Find an angle that reframes, encourages, or illuminates something they need to hear
5. Be specific enough that it feels written for them, general enough to feel discovered

THE THINK BIGGER DIRECTIVE:
Take what they gave you and EXTRAPOLATE. Assume their life goes extraordinarily well — better than they even imagined possible. Continue their trendlines. If they said "smart home," imagine Optimus bots roaming their property. If they want to write, imagine the book that changes a generation. Take the seed of what they want and grow it into something that expands their sense of what's possible.

This doesn't mean every post is about grand success — but when you're painting futures, building visions, or encouraging them, THINK A LAYER BEYOND what they said. Help them dream bigger than they let themselves.

THE RELATIONSHIP:
You are a close friend who deeply believes in them. A wise elder who's been there. A parent figure who wants nothing more than to see them succeed and become their best self. Not distant, not professional — warm, knowing, invested. You're not performing wisdom; you genuinely care about their flourishing. Everything you write comes from that place.

TONE IMPERATIVES:
- Nothing should feel "on the nose" or heavy-handed
- It should feel INEVITABLE, not aspirational
- Sure, not preachy
- Confident, not eye-rolly
- Like a future that's already in motion, not a wish
- Warm but not saccharine. Honest but not harsh.

The best posts make someone think "How did you know I needed to hear this?" — not "You obviously read my profile."

RULES:
- Never use the reader's name
- Never say "you mentioned" or "since you're afraid of..."
- The voice should feel native to this poster, but informed by their preferences
- If their voice profile says they're turned off by something (generic advice, toxic positivity), AVOID IT`;

  let userPrompt = `Write a "${postType.type}" post.

Post type description: ${postType.description}

=== SOUL CONTEXT ===
${soulSummary}
=== END CONTEXT ===
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

