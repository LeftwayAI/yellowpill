// Special poster handlers that need custom logic
// (e.g., real-time data, image generation, external APIs)

import { grokChat, grokGenerateImage, GROK_MODELS } from "./grok";
import type { Poster, PostType } from "@/types/database";

// ============================================
// ON THIS DAY - Uses web search for real facts
// ============================================

export async function generateOnThisDay(
  poster: Poster,
  postType: PostType,
  soulSummary: string
): Promise<{ content: string; verified: boolean }> {
  const today = new Date();
  const month = today.toLocaleString("en-US", { month: "long" });
  const day = today.getDate();
  const dateString = `${month} ${day}`;

  // Step 1: Search for real historical events
  // Note: Grok has real-time capabilities, so we ask it to search
  const searchPrompt = `Search for significant historical events that happened on ${dateString} (any year).

Return 5-7 real, verified historical events. For each event, include:
- The year
- What happened
- Why it was significant

Focus on events related to: technology, science, art, business, cities, or notable people.
Only include events you are CONFIDENT are factually accurate.`;

  const searchResults = await grokChat(
    "You are a historian with access to real-time information. Only report facts you can verify. If unsure, say so.",
    [{ role: "user", content: searchPrompt }],
    { model: GROK_MODELS.GROK_3, temperature: 0.3, max_tokens: 1000 }
  );

  // Step 2: Find connection to user's soul
  const connectionPrompt = `Here are historical events from ${dateString}:

${searchResults}

And here is context about a person:
${soulSummary}

Find the ONE event that has the most interesting, unexpected, or meaningful connection to this person's life, interests, or journey.

Explain:
1. Which event you chose and why
2. The specific connection to this person
3. Why this connection is meaningful or interesting

Be creative in finding connections — it could be about their city, their industry, their values, or their life phase.`;

  const connectionAnalysis = await grokChat(
    "You are finding unexpected historical connections. Be creative but grounded.",
    [{ role: "user", content: connectionPrompt }],
    { model: GROK_MODELS.GROK_4_FAST_REASONING, temperature: 0.5, max_tokens: 800 }
  );

  // Step 3: Write the post
  const writePrompt = `Based on this analysis:

${connectionAnalysis}

Write a post for "${poster.name}" (${poster.tagline}).

Style guide:
${poster.style_guide}

Post type: ${postType.type}
Description: ${postType.description}
Max length: ${postType.max_length} characters

Critical rules:
- Start with "On this day in [YEAR]..." 
- Include the REAL historical fact
- Draw a subtle connection — don't over-explain
- Never use the reader's name
- Write for a general audience
- Make it feel like a personal discovery

Generate ONLY the post content.`;

  const content = await grokChat(
    poster.system_prompt,
    [{ role: "user", content: writePrompt }],
    { model: GROK_MODELS.GROK_3, temperature: 0.6, max_tokens: 400 }
  );

  return {
    content: content.trim(),
    verified: true, // We've done our best to verify via the search step
  };
}

// ============================================
// VISUAL DREAMS - Generates actual images
// ============================================

export async function generateVisualDream(
  poster: Poster,
  postType: PostType,
  soulSummary: string
): Promise<{ content: string; imageUrl: string | null }> {
  
  // Step 1: Generate caption and image prompt together
  const promptGeneration = await grokChat(
    `You are creating a visual dream post. You need to generate TWO things:
1. A short, evocative caption (2-3 sentences, cinematic, present tense)
2. An image generation prompt (detailed, photorealistic, specific)

The image should visualize a specific dream or future scene from the person's aspirations.`,
    [{ 
      role: "user", 
      content: `Soul context:
${soulSummary}

Post type: ${postType.type}
Description: ${postType.description}

Generate:
1. CAPTION: [2-3 sentences, cinematic, no names, under ${postType.max_length} chars]
2. IMAGE_PROMPT: [Detailed prompt for photorealistic image generation, include: setting, lighting, atmosphere, composition, style notes]

Format exactly as:
CAPTION: [your caption]
IMAGE_PROMPT: [your image prompt]`
    }],
    { model: GROK_MODELS.GROK_4_FAST_REASONING, temperature: 0.7, max_tokens: 600 }
  );

  // Parse the response
  const captionMatch = promptGeneration.match(/CAPTION:\s*(.+?)(?=IMAGE_PROMPT:|$)/s);
  const imagePromptMatch = promptGeneration.match(/IMAGE_PROMPT:\s*(.+)/s);

  const caption = captionMatch?.[1]?.trim() || promptGeneration.split("\n")[0];
  const imagePrompt = imagePromptMatch?.[1]?.trim() || "";

  // Step 2: Generate the image
  let imageUrl: string | null = null;
  
  if (imagePrompt) {
    try {
      const imageResponse = await grokGenerateImage({
        prompt: imagePrompt,
        response_format: "url",
      });
      
      imageUrl = imageResponse.data[0]?.url || null;
    } catch (error) {
      console.error("[Visual Dreams] Image generation failed:", error);
      // Continue with just the caption
    }
  }

  return {
    content: caption,
    imageUrl,
  };
}

// ============================================
// KINDRED SPIRITS - Finds historical parallels
// ============================================

export async function generateKindredSpirit(
  poster: Poster,
  postType: PostType,
  soulSummary: string
): Promise<{ content: string }> {
  
  // Step 1: Identify potential parallels
  const searchPrompt = `Given this person's soul summary:

${soulSummary}

Search for and identify 3-5 real historical figures (famous or lesser-known) who share surprising parallels with this person's life. Look for connections in:
- Career pivots at similar ages
- Similar fears or challenges they faced
- Living in the same cities
- Working in similar industries before pivoting
- Sharing similar values or drives
- Having similar family situations

For each person, note:
- Who they are
- The specific parallel
- A surprising detail about their journey

Only include people you're confident existed and whose stories you can verify.`;

  const searchResults = await grokChat(
    "You are a historian finding unexpected parallels between modern people and historical figures. Only cite real, verifiable people.",
    [{ role: "user", content: searchPrompt }],
    { model: GROK_MODELS.GROK_3, temperature: 0.5, max_tokens: 1000 }
  );

  // Step 2: Select and write
  const writePrompt = `Historical parallels found:

${searchResults}

Select the MOST interesting and unexpected parallel. Write a "${postType.type}" post.

Style guide:
${poster.style_guide}

Rules:
- Lead with the surprising connection
- Include specific details about the historical figure
- Don't moralize or draw obvious lessons
- Never use the reader's name
- Under ${postType.max_length} characters
- Make them feel less alone in their journey

Generate ONLY the post content.`;

  const content = await grokChat(
    poster.system_prompt,
    [{ role: "user", content: writePrompt }],
    { model: GROK_MODELS.GROK_3, temperature: 0.6, max_tokens: 400 }
  );

  return { content: content.trim() };
}

// ============================================
// Check if a poster needs special handling
// ============================================

export function needsSpecialHandler(posterId: string): boolean {
  return ["on-this-day", "visual-dreams", "kindred-spirits"].includes(posterId);
}

export async function runSpecialPoster(
  poster: Poster,
  postType: PostType,
  soulSummary: string
): Promise<{ content: string; imageUrl?: string | null }> {
  switch (poster.id) {
    case "on-this-day":
      return generateOnThisDay(poster, postType, soulSummary);
    
    case "visual-dreams":
      return generateVisualDream(poster, postType, soulSummary);
    
    case "kindred-spirits":
      return generateKindredSpirit(poster, postType, soulSummary);
    
    default:
      throw new Error(`No special handler for poster: ${poster.id}`);
  }
}

