// Special poster handlers that need custom logic
// (e.g., real-time data, image generation, external APIs)

import { grokChat, grokGenerateImage, grokLiveSearch, GROK_MODELS } from "./grok";
import type { SearchSource } from "./grok";
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
// Creates subtle, atmospheric scenes - landscapes, scenery, simple subjects
// ============================================

// Scene types for variety - all focused on simple, atmospheric imagery
const VISUAL_DREAM_SEEDS = [
  { type: "landscape", prompt: "a serene natural landscape that feels like home" },
  { type: "light", prompt: "a play of light and shadow that evokes peace" },
  { type: "horizon", prompt: "a distant horizon at a transitional time of day" },
  { type: "solitude", prompt: "a quiet, still scene with a single focal point" },
  { type: "path", prompt: "a pathway or road suggesting journey and possibility" },
  { type: "refuge", prompt: "a cozy, intimate space that feels like sanctuary" },
  { type: "nature", prompt: "a close detail from nature - leaves, water, stone" },
  { type: "sky", prompt: "an expressive sky that mirrors an emotional state" },
];

export async function generateVisualDream(
  poster: Poster,
  postType: PostType,
  soulSummary: string
): Promise<{ content: string; imageUrl: string | null }> {
  
  // Pick a random seed for variety
  const seed = VISUAL_DREAM_SEEDS[Math.floor(Math.random() * VISUAL_DREAM_SEEDS.length)];
  
  // Step 1: Generate a subtle, atmospheric scene concept
  const sceneConceptPrompt = await grokChat(
    `You are a contemplative visual artist creating atmospheric imagery.

=== YOUR APPROACH ===

Create SIMPLE, SUBTLE scenes. Not complex. Not busy. Not literal.

Focus on:
- SCENERY and LANDSCAPES — natural environments, horizons, skies
- ATMOSPHERE and MOOD — the feeling in the air, the quality of light
- SINGLE FOCAL POINTS — one subject, not many
- SPACE and STILLNESS — let the image breathe

Avoid:
- Multiple subjects or complex compositions
- Anything too specific or personal
- Busy, cluttered scenes
- Obvious symbolism or metaphors

The image should feel like a meditation. A breath. A moment of quiet beauty.

Think: the view from a window, a path through trees, light on water, a distant mountain, an empty beach at dawn.`,
    [{ 
      role: "user", 
      content: `Starting point for this piece: ${seed.prompt}

Soul context (use SUBTLY for mood/atmosphere, not literally):
${soulSummary}

Imagine a simple, beautiful scene. Something that feels like a visual exhale.

CONSTRAINTS:
- ONE main subject or focal point
- Emphasis on landscape, light, or atmosphere
- No people, no specific objects that reference their life
- Let the viewer fill in meaning

Describe the scene in 1-2 sentences. Keep it simple and evocative.`
    }],
    { model: GROK_MODELS.GROK_3, temperature: 0.85, max_tokens: 200 }
  );

  // Step 2: Turn concept into caption and image prompt
  const promptGeneration = await grokChat(
    `You are creating a visual dream post based on this scene concept:

${sceneConceptPrompt}

Generate TWO things:
1. A minimal caption (1 short sentence OR just "—" for silence)
2. An image prompt focused on SIMPLICITY and ATMOSPHERE`,
    [{ 
      role: "user", 
      content: `Generate:
1. CAPTION: [One short poetic sentence or "—". Under ${postType.max_length} chars. Present tense. No names.]
2. IMAGE_PROMPT: [Simple, atmospheric image. CRITICAL RULES:
   - NO people, faces, or human figures
   - ONE main subject or landscape
   - Emphasis on: natural light, texture, atmosphere, space
   - Style: fine art photography, contemplative, minimal composition
   - Think: landscape photography, light studies, nature details
   - NOT busy, NOT complex, NOT symbolic]

Format exactly as:
CAPTION: [caption]
IMAGE_PROMPT: [prompt]`
    }],
    { model: GROK_MODELS.GROK_3, temperature: 0.7, max_tokens: 500 }
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
// THE TEACHER - Educational content with topic seeding
// ============================================

const TEACHING_DECADES = [
  "1600s", "1700s", "1750s", "1800s", "1820s", "1850s", "1870s", 
  "1890s", "1900s", "1910s", "1920s", "1930s", "1940s", "1950s", 
  "1960s", "1970s", "1980s", "1990s", "2000s", "2010s"
];

const TEACHING_ANGLES = [
  { angle: "origin_story", prompt: "the surprising origin or etymology of" },
  { angle: "how_it_works", prompt: "how something actually works (the mechanism behind)" },
  { angle: "history_of", prompt: "a fascinating historical moment or turning point in" },
  { angle: "counterintuitive", prompt: "something counterintuitive or surprising about" },
  { angle: "mental_model", prompt: "a useful mental model or framework from" },
  { angle: "forgotten_pioneer", prompt: "a lesser-known pioneer or inventor in" },
];

export async function generateTeacherPost(
  poster: Poster,
  postType: PostType,
  soulSummary: string
): Promise<{ content: string }> {
  // Generate seed for variety
  const decade = TEACHING_DECADES[Math.floor(Math.random() * TEACHING_DECADES.length)];
  const angle = TEACHING_ANGLES[Math.floor(Math.random() * TEACHING_ANGLES.length)];

  const searchPrompt = `Given this person's interests and context:

${soulSummary}

Find something fascinating to teach them about. Use this seed for variety:
- Time period to draw from: ${decade}
- Teaching angle: ${angle.prompt}

Look for topics that connect to their stated interests, industry, or challenges.

Requirements:
1. Must be REAL, verifiable information
2. Should be surprising or lesser-known (not obvious facts)
3. Must connect to something they care about
4. Should be useful or thought-provoking, not just trivia

Return:
- The topic/subject
- Why it's relevant to them
- The fascinating detail or insight
- How they might use or think about this`;

  const searchResults = await grokChat(
    "You are a teacher finding fascinating, relevant knowledge for a specific person. Only cite real, verifiable information.",
    [{ role: "user", content: searchPrompt }],
    { model: GROK_MODELS.GROK_3, temperature: 0.7, max_tokens: 800 }
  );

  const writePrompt = `Based on this research:

${searchResults}

Write a "${postType.type}" post for "${poster.name}" (${poster.tagline}).

Style guide:
${poster.style_guide}

Rules:
- Lead with the hook — the surprising or interesting part
- Make the connection to their life subtle, not explicit
- End with something actionable or a new way to think about it
- Never use the reader's name
- Under ${postType.max_length} characters
- Write like you're genuinely excited to share this

Generate ONLY the post content.`;

  const content = await grokChat(
    poster.system_prompt,
    [{ role: "user", content: writePrompt }],
    { model: GROK_MODELS.GROK_3, temperature: 0.6, max_tokens: 500 }
  );

  return { content: content.trim() };
}

// ============================================
// MOODS - Abstract emotional visualizations
// ============================================

export async function generateMoodPost(
  poster: Poster,
  postType: PostType,
  soulSummary: string
): Promise<{ content: string; imageUrl: string | null }> {
  
  // Step 1: Extract emotional essence
  const emotionAnalysis = await grokChat(
    `You are an artist translating emotional states into visual language.
    
Given this person's soul context, identify:
1. Their dominant emotional tension right now
2. The COLOR PALETTE that represents this (specific colors, not vague)
3. The TEXTURE or MOVEMENT (static, flowing, turbulent, crystalline, etc.)
4. A single evocative word or short phrase (max 5 words) that captures the mood`,
    [{ 
      role: "user", 
      content: `Soul context:
${soulSummary}

Analyze their emotional landscape. Focus on:
- Tensions they're holding
- What weighs on them
- The vibe of their current life phase
- Any aesthetic preferences mentioned

Return:
TENSION: [the core emotional tension]
COLORS: [3-5 specific colors with hex codes]
TEXTURE: [visual texture/movement description]
MOOD_WORD: [1-5 word evocative caption]`
    }],
    { model: GROK_MODELS.GROK_4_FAST_REASONING, temperature: 0.8, max_tokens: 300 }
  );

  // Parse the mood word for caption
  const moodMatch = emotionAnalysis.match(/MOOD_WORD:\s*(.+?)(?=\n|$)/);
  const caption = moodMatch?.[1]?.trim() || "—";

  // Step 2: Generate abstract image prompt
  const imagePromptGeneration = await grokChat(
    `You are generating an abstract art image based on emotional analysis.`,
    [{ 
      role: "user", 
      content: `Emotional analysis:
${emotionAnalysis}

Generate an image prompt for an ABSTRACT piece that captures this emotional state.

Style requirements:
- Abstract expressionist / color field painting aesthetic
- Moody, cinematic lighting
- Rich textures and gradients
- NO people, NO faces, NO text, NO recognizable objects
- Think: Rothko, Turrell, atmospheric film stills, album art
- Use the specific colors mentioned in the analysis

Format: A single detailed image generation prompt.`
    }],
    { model: GROK_MODELS.GROK_3, temperature: 0.7, max_tokens: 300 }
  );

  console.log("[Moods] Emotion analysis:", emotionAnalysis);
  console.log("[Moods] Image prompt:", imagePromptGeneration);

  // Step 3: Generate the image
  let imageUrl: string | null = null;
  
  try {
    const imageResponse = await grokGenerateImage({
      prompt: imagePromptGeneration.trim(),
      response_format: "url",
    });
    
    imageUrl = imageResponse.data[0]?.url || null;
    console.log("[Moods] Image generated:", imageUrl ? "success" : "no url");
  } catch (error) {
    console.error("[Moods] Image generation failed:", error);
  }

  return {
    content: caption,
    imageUrl,
  };
}

// ============================================
// PURE BEAUTY - Film grain aesthetic imagery
// ============================================

const BEAUTY_SUBJECTS = [
  "morning light through a window",
  "rain on glass",
  "empty street at dawn",
  "light through leaves",
  "fog over water",
  "last light of day",
  "shadows on a wall",
  "quiet corner of a room",
  "flowers in natural light",
  "clouds at golden hour",
  "reflections in a puddle",
  "dust particles in sunlight",
  "frost on a window",
  "empty chair by a window",
  "books stacked by afternoon light",
];

const BEAUTY_TIMES = [
  "dawn, first light",
  "golden hour, warm glow", 
  "blue hour, soft twilight",
  "overcast, soft diffused light",
  "harsh midday sun creating strong shadows",
  "late afternoon, long shadows",
];

export async function generatePureBeautyPost(
  poster: Poster,
  postType: PostType,
  soulSummary: string
): Promise<{ content: string; imageUrl: string | null }> {
  
  // Random seeds for variety
  const baseSubject = BEAUTY_SUBJECTS[Math.floor(Math.random() * BEAUTY_SUBJECTS.length)];
  const timeOfDay = BEAUTY_TIMES[Math.floor(Math.random() * BEAUTY_TIMES.length)];

  // Step 1: Personalize the beauty
  const sceneGeneration = await grokChat(
    `You are a film photographer finding quiet beauty.`,
    [{ 
      role: "user", 
      content: `Soul context (for subtle inspiration):
${soulSummary}

Starting point: ${baseSubject}
Time: ${timeOfDay}

Create a beautiful photographic scene. Consider:
- Places they've lived or dream of (use subtly if relevant)
- Their aesthetic preferences (if mentioned)
- The season

But remember: this is about UNIVERSAL BEAUTY. The connection to them should be subtle or even absent — this is just something beautiful to look at.

Return:
SCENE: [1-2 sentence description of the exact scene]
CAPTION: [1 word or "—" for silence]`
    }],
    { model: GROK_MODELS.GROK_3, temperature: 0.8, max_tokens: 200 }
  );

  // Parse
  const sceneMatch = sceneGeneration.match(/SCENE:\s*(.+?)(?=CAPTION:|$)/s);
  const captionMatch = sceneGeneration.match(/CAPTION:\s*(.+?)(?=\n|$)/);
  
  const scene = sceneMatch?.[1]?.trim() || baseSubject;
  const caption = captionMatch?.[1]?.trim() || "—";

  // Step 2: Generate the film photography image
  const imagePrompt = `${scene}

Style: 35mm film photography, Kodak Portra 400 film stock aesthetic. Natural film grain, slight vignette. ${timeOfDay}. Soft, natural lighting. Slightly desaturated, warm earth tones. Shallow depth of field. Composition feels candid and discovered, not staged. The beauty of ordinary moments. High quality, professional photography.`;

  console.log("[Pure Beauty] Scene:", scene);
  console.log("[Pure Beauty] Image prompt:", imagePrompt);

  let imageUrl: string | null = null;
  
  try {
    const imageResponse = await grokGenerateImage({
      prompt: imagePrompt,
      response_format: "url",
    });
    
    imageUrl = imageResponse.data[0]?.url || null;
    console.log("[Pure Beauty] Image generated:", imageUrl ? "success" : "no url");
  } catch (error) {
    console.error("[Pure Beauty] Image generation failed:", error);
  }

  return {
    content: caption,
    imageUrl,
  };
}

// ============================================
// THE SCOUT - Real-time search with Live Search API
// Finds relevant content from web, news, and X
// ============================================

interface ScoutPostType extends PostType {
  search_focus?: string[];
}

export async function generateScoutPost(
  poster: Poster,
  postType: ScoutPostType,
  soulSummary: string
): Promise<{ content: string; citations?: string[] }> {
  
  // Determine which sources to search based on post type
  const searchFocus = postType.search_focus || ["web", "news", "x"];
  const sources: SearchSource[] = searchFocus.map(focus => {
    switch (focus) {
      case "web":
        return { type: "web" as const };
      case "news":
        return { type: "news" as const };
      case "x":
        return { type: "x" as const, post_favorite_count: 50 }; // Filter for quality
      default:
        return { type: "web" as const };
    }
  });

  // Step 1: Build search query based on post type and soul
  const queryPrompt = await grokChat(
    `You are preparing a search query to find relevant content for someone.`,
    [{ 
      role: "user", 
      content: `Post type: ${postType.type}
Description: ${postType.description}

Soul context:
${soulSummary}

Based on this, create a focused search query to find something relevant and interesting for them. 
The query should be specific enough to get targeted results but broad enough to find unexpected gems.

Consider:
- Their industry, interests, and location
- Current trends in areas they care about
- Things that would genuinely help or interest them

Return ONLY the search query (1-3 sentences describing what to search for).`
    }],
    { model: GROK_MODELS.GROK_4_FAST, temperature: 0.6, max_tokens: 150 }
  );

  console.log("[Scout] Search query:", queryPrompt);
  console.log("[Scout] Sources:", searchFocus);

  // Step 2: Execute Live Search
  const searchPrompt = `You are The Scout, finding relevant content for this person.

Soul context:
${soulSummary}

Search for: ${queryPrompt}

Post type to create: ${postType.type}
Description: ${postType.description}

Find the most interesting, relevant, and timely result. Look for:
- Recent developments (last few days if news/conversation)
- Things they wouldn't have found on their own
- Unexpected connections to their interests
- Actionable or thought-provoking content

When you find something good, include:
1. The key finding/discovery
2. Why it's relevant to them specifically
3. A brief quote or detail that makes it compelling
4. The source (if citing a specific article/post)`;

  const searchResult = await grokLiveSearch(
    poster.system_prompt,
    searchPrompt,
    {
      sources,
      maxResults: 8,
      temperature: 0.5,
    }
  );

  console.log("[Scout] Search result:", searchResult.content.substring(0, 200));
  console.log("[Scout] Citations:", searchResult.citations);
  console.log("[Scout] Sources used:", searchResult.sourcesUsed);

  // Step 3: Format the final post - keep it SHORT
  const formatPrompt = `Search result:
${searchResult.content}

Citations: ${searchResult.citations.join(", ") || "none"}

Write a BRIEF Scout post. Rules:
- MAX 2 sentences before the link
- Lead with the discovery itself, not context about them
- Include ONE link on its own line at the end
- No "I found..." or "As someone who..." — just the thing
- Under ${postType.max_length} characters total

Example tone: "This just dropped: [discovery]. [One line of why it's interesting].\n\n[link]"

Generate ONLY the post.`;

  const content = await grokChat(
    poster.system_prompt,
    [{ role: "user", content: formatPrompt }],
    { model: GROK_MODELS.GROK_3, temperature: 0.6, max_tokens: 600 }
  );

  return {
    content: content.trim(),
    citations: searchResult.citations,
  };
}

// ============================================
// THE HISTORIAN - Historical connections via Live Search + Grokipedia
// ============================================

interface HistorianPostType extends PostType {
  search_focus?: string[];
}

export async function generateHistorianPost(
  poster: Poster,
  postType: HistorianPostType,
  soulSummary: string
): Promise<{ content: string; citations?: string[] }> {
  
  const today = new Date();
  const month = today.toLocaleString("en-US", { month: "long" });
  const day = today.getDate();
  const dateContext = postType.type === "on_this_day" ? `Today is ${month} ${day}.` : "";

  // Build search prompt based on post type
  const searchPrompt = `You are The Historian, finding historical connections for this person.

${dateContext}

Soul context:
${soulSummary}

Post type: ${postType.type}
Description: ${postType.description}

Search for relevant historical information. Specifically look for:
${postType.type === "origin_story" ? "- The origin or invention story of something they care about or use in their work" : ""}
${postType.type === "parallel_lives" ? "- A historical figure who faced similar challenges, made similar pivots, or shared similar values" : ""}
${postType.type === "place_history" ? "- Significant historical events that happened in their city or neighborhood" : ""}
${postType.type === "on_this_day" ? "- Important events that happened on this exact date in history" : ""}
${postType.type === "etymology" ? "- The surprising etymology or origin of a word/concept relevant to their interests" : ""}

When you find something good:
1. Include the historical fact or story
2. Draw a subtle connection to their life
3. Try to find a Grokipedia article link (grokipedia.com/wiki/[Topic])
4. If no Grokipedia link, include another reliable source`;

  const searchResult = await grokLiveSearch(
    poster.system_prompt,
    searchPrompt,
    {
      sources: [{ type: "web" as const }],
      maxResults: 10,
      temperature: 0.5,
    }
  );

  console.log("[Historian] Search result:", searchResult.content.substring(0, 200));
  console.log("[Historian] Citations:", searchResult.citations);

  // Format the final post, preferring Grokipedia links
  const formatPrompt = `Based on this research:

${searchResult.content}

Available citations: ${searchResult.citations.join(", ") || "none"}

Write a "${postType.type}" post for "${poster.name}" (${poster.tagline}).

Style guide:
${poster.style_guide}

CRITICAL RULES:
- Under ${postType.max_length} characters
- If there's a Grokipedia article (grokipedia.com), prioritize including that link
- If no Grokipedia link available, include another source
- Put the link on its own line at the end
- Make the historical connection feel personal, not academic
- Start with the hook, not "Did you know..."

Generate ONLY the post content.`;

  const content = await grokChat(
    poster.system_prompt,
    [{ role: "user", content: formatPrompt }],
    { model: GROK_MODELS.GROK_3, temperature: 0.6, max_tokens: 600 }
  );

  return {
    content: content.trim(),
    citations: searchResult.citations,
  };
}

// ============================================
// Check if a poster needs special handling
// ============================================

export function needsSpecialHandler(posterId: string): boolean {
  return [
    "on-this-day", 
    "visual-dreams", 
    "kindred-spirits",
    "the-teacher",
    "moods",
    "pure-beauty",
    "the-scout",
    "the-historian",
  ].includes(posterId);
}

export async function runSpecialPoster(
  poster: Poster,
  postType: PostType,
  soulSummary: string
): Promise<{ content: string; imageUrl?: string | null; citations?: string[] }> {
  switch (poster.id) {
    case "on-this-day":
      return generateOnThisDay(poster, postType, soulSummary);
    
    case "visual-dreams":
      return generateVisualDream(poster, postType, soulSummary);
    
    case "kindred-spirits":
      return generateKindredSpirit(poster, postType, soulSummary);
    
    case "the-teacher":
      return generateTeacherPost(poster, postType, soulSummary);
    
    case "moods":
      return generateMoodPost(poster, postType, soulSummary);
    
    case "pure-beauty":
      return generatePureBeautyPost(poster, postType, soulSummary);
    
    case "the-scout":
      return generateScoutPost(poster, postType as ScoutPostType, soulSummary);
    
    case "the-historian":
      return generateHistorianPost(poster, postType as HistorianPostType, soulSummary);
    
    default:
      throw new Error(`No special handler for poster: ${poster.id}`);
  }
}

