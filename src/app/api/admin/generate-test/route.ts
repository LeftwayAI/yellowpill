import { NextResponse } from "next/server";
import { runCustomGeneration } from "@/lib/generation-pipeline";

// Seed generation for variety
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

function generateSeedConstraint(posterId: string): { constraint: string; seed: string } | null {
  // Quick Quote: Random source category + theme (not letter-based)
  if (posterId === "daily-dose") {
    const source = QUOTE_SOURCES[Math.floor(Math.random() * QUOTE_SOURCES.length)];
    const theme = QUOTE_THEMES[Math.floor(Math.random() * QUOTE_THEMES.length)];
    
    return {
      seed: `${source.category} / ${theme}`,
      constraint: `CONSTRAINT: Find a real quote from a ${source.category} (like ${source.examples}) about ${theme}.

CRITICAL: You MUST use a real, verified quote. Do NOT make up quotes. Do NOT modify quotes. If you're not 100% certain the quote is real and correctly attributed, pick a different one you ARE certain about.

The quote should feel unexpected — not the obvious choice.

FORMAT: Output ONLY the quote and attribution. NO preamble, NO intro like "On finding meaning:" or "About creativity:" — JUST the quote itself, then the author.
Example format:
"The quote text goes here exactly as written."
— Author Name`,
    };
  }
  
  // Scenes From Your Future: Random time/season/year - TANGENTIAL scenes
  if (posterId === "scenes-future") {
    const season = SEASONS[Math.floor(Math.random() * SEASONS.length)];
    const time = TIMES_OF_DAY[Math.floor(Math.random() * TIMES_OF_DAY.length)];
    const yearsAhead = YEARS_AHEAD[Math.floor(Math.random() * YEARS_AHEAD.length)];
    
    return {
      seed: `${season}, ${time}, ${yearsAhead}y`,
      constraint: `CONSTRAINT: The scene MUST take place in ${season}, during ${time}, approximately ${yearsAhead} year${yearsAhead > 1 ? "s" : ""} from now.

CRITICAL DIRECTION: Do NOT visualize the exact things they said they wanted. Instead, imagine TANGENTIAL scenes — things ADJACENT to their dreams that would make them just as happy.

Think about:
- What byproducts of success look like (not the award ceremony, but the random Tuesday after)
- What their life AROUND their goals might look like (not the book launch, but the morning routine of a person who writes)
- Unexpected moments that signal they've arrived (not closing the deal, but teaching someone else how)
- The small human moments that accompany big achievements

If they want to be a writer: don't show them at a signing — show them skipping a party because they're in flow.
If they want financial freedom: don't show wealth — show the 2pm Tuesday where they chose a long walk over a meeting.

Start with a time anchor like "It's ${season}, ${new Date().getFullYear() + yearsAhead}. ${time.charAt(0).toUpperCase() + time.slice(1)}..."`,
    };
  }
  
  return null;
}

interface GenerateTestRequest {
  systemPrompt: string;
  posterId: string;
  postType: {
    type: string;
    description: string;
    max_length: number;
  };
  soulSummary: string;
  temperature?: number;
}

// Block in production
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  try {
    const body: GenerateTestRequest = await request.json();
    const { systemPrompt, posterId, postType, soulSummary, temperature = 0.75 } = body;

    if (!systemPrompt || !postType || !soulSummary) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate seed constraint for variety
    const seedData = generateSeedConstraint(posterId);

    // Build the user prompt
    let userPrompt = `Write a "${postType.type}" post.

Post type description: ${postType.description}

Soul context (use to inform the vibe, NOT to reference explicitly):
${soulSummary}
`;

    // Add seed constraint if present
    if (seedData) {
      userPrompt += `
${seedData.constraint}
`;
    }

    userPrompt += `
Constraints:
- Maximum ${postType.max_length} characters
- No emojis
- No names or direct address

Generate ONLY the post content. No preamble, no explanation.`;

    const result = await runCustomGeneration(systemPrompt, userPrompt, { temperature });

    return NextResponse.json({
      ...result,
      seed: seedData?.seed || null,
    });
  } catch (error) {
    console.error("Admin generate-test error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}

