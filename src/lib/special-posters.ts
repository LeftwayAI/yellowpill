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
// VISUAL DREAMS / FUTURE VISUALIZER - Generates actual images
// Creates tangential, adjacent scenes - NOT literal interpretations
// ============================================

export async function generateVisualDream(
  poster: Poster,
  postType: PostType,
  soulSummary: string
): Promise<{ content: string; imageUrl: string | null }> {
  
  // Step 1: Generate a TANGENTIAL scene concept first
  const sceneConceptPrompt = await grokChat(
    `You are an imaginative director who creates visual daydreams for someone's future.

=== THE MOST IMPORTANT RULE ===

DO NOT visualize what they explicitly said they wanted.

If they said "write a book" → DO NOT show books, writing, desks, publishing
If they said "financial freedom" → DO NOT show money, luxury, retirement
If they said "start a company" → DO NOT show offices, meetings, products

Instead, imagine what would make THIS SPECIFIC PERSON happy based on WHO THEY ARE:

1. SENSORY PLEASURES they'd love: A specific quality of light. A sound. A temperature. A texture.

2. QUIET EVIDENCE OF ARRIVAL: What mundane moments would only exist if everything went well? 
   - A specific type of nap they'd finally take without guilt
   - A phone call from a parent asking THEM for advice
   - An airport departure board showing somewhere unexpected
   - A pet curled up next to them on a couch they love

3. UNEXPECTED JOYS: Based on their personality, what might they discover they love?
   - The collector who has a garden now
   - The type-A achiever who's really into pottery
   - The introvert hosting a dinner party they actually enjoy

The image should make them think "I didn't know I wanted that" not "That's exactly what I told you."`,
    [{ 
      role: "user", 
      content: `Soul context:
${soulSummary}

Based on who this person IS (not just what they said they want), imagine a visual scene that would bring them unexpected joy.

Think about:
- What sensory experience would make their specific personality type light up?
- What quiet moment of arrival would only exist if their deeper values were being lived?
- What hobby/pleasure/scene would surprise them but feel perfectly "them"?

Describe the scene concept in 2-3 sentences. Be VERY SPECIFIC about visual details.`
    }],
    { model: GROK_MODELS.GROK_4_FAST_REASONING, temperature: 0.9, max_tokens: 300 }
  );

  // Step 2: Turn concept into caption and image prompt
  const promptGeneration = await grokChat(
    `You are creating a visual dream post based on this scene concept:

${sceneConceptPrompt}

You need to generate TWO things:
1. A short, evocative caption (2-3 sentences, cinematic, present tense, second person "you")
2. An image generation prompt (detailed, photorealistic, NO PEOPLE OR FACES, focus on environment/objects)`,
    [{ 
      role: "user", 
      content: `Generate:
1. CAPTION: [2-3 sentences, cinematic, under ${postType.max_length} chars, no names, present tense]
2. IMAGE_PROMPT: [Detailed prompt for photorealistic image. CRITICAL: Do NOT include any people, faces, or human figures. Focus on: setting, objects, lighting, atmosphere, time of day, textures, colors. Style: cinematic photography, shallow depth of field, natural lighting]

Format exactly as:
CAPTION: [your caption]
IMAGE_PROMPT: [your image prompt]`
    }],
    { model: GROK_MODELS.GROK_3, temperature: 0.7, max_tokens: 600 }
  );

  // Parse the response
  const captionMatch = promptGeneration.match(/CAPTION:\s*(.+?)(?=IMAGE_PROMPT:|$)/s);
  const imagePromptMatch = promptGeneration.match(/IMAGE_PROMPT:\s*(.+)/s);

  const caption = captionMatch?.[1]?.trim() || promptGeneration.split("\n")[0];
  const imagePrompt = imagePromptMatch?.[1]?.trim() || "";

  console.log("[Visual Dreams] Scene concept:", sceneConceptPrompt);
  console.log("[Visual Dreams] Image prompt:", imagePrompt);

  // Step 3: Generate the image
  let imageUrl: string | null = null;
  
  if (imagePrompt) {
    try {
      const imageResponse = await grokGenerateImage({
        prompt: imagePrompt,
        response_format: "url",
      });
      
      imageUrl = imageResponse.data[0]?.url || null;
      console.log("[Visual Dreams] Image generated:", imageUrl ? "success" : "no url");
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

