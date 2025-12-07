import { NextResponse } from "next/server";
import { grokChat, grokGenerateImage, GROK_MODELS } from "@/lib/grok";

// Block in production
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { prompt, soulSummary, mode = "direct" } = body;

    if (!prompt && !soulSummary) {
      return NextResponse.json(
        { error: "Missing prompt or soulSummary" },
        { status: 400 }
      );
    }

    let imagePrompt = prompt;
    let caption = "";

    // If mode is "tangential", generate a tangential scene first
    if (mode === "tangential" && soulSummary) {
      console.log("[Generate Image] Creating tangential scene...");
      
      // Step 1: Generate tangential concept
      const sceneConceptPrompt = await grokChat(
        `You are an imaginative director who creates TANGENTIAL visualizations of someone's future.

CRITICAL: Do NOT visualize the LITERAL things they said they wanted. Instead, imagine scenes ADJACENT to their dreams:

If they want to write a book → Show the empty coffee cup at 5am, the view from a window during a writing session
If they want financial freedom → Show a random Tuesday afternoon nap in golden light
If they want to build something → Show the aftermath: a workshop with sawdust, a whiteboard covered in ideas left from yesterday
If they want connection → Show a single chair at a long table set for dinner, guests arriving out of frame

The scene should make them FEEL what success would feel like, not SHOW the success itself.`,
        [{ 
          role: "user", 
          content: `Soul context:
${soulSummary}

Based on who this person is, imagine a TANGENTIAL future scene. What's a scene that would make them tear up not because it shows success, but because it shows what life AROUND success would feel like?

Describe the scene in 2-3 sentences.`
        }],
        { model: GROK_MODELS.GROK_4_FAST_REASONING, temperature: 0.85, max_tokens: 300 }
      );

      console.log("[Generate Image] Scene concept:", sceneConceptPrompt);

      // Step 2: Generate caption and image prompt
      const promptGeneration = await grokChat(
        `You are creating a visual dream post based on this scene concept:

${sceneConceptPrompt}

Generate TWO things:
1. A short, evocative caption (2-3 sentences, cinematic, present tense, second person "you")
2. An image generation prompt (detailed, photorealistic, NO PEOPLE OR FACES)`,
        [{ 
          role: "user", 
          content: `Format exactly as:
CAPTION: [your caption, cinematic, under 280 chars]
IMAGE_PROMPT: [Detailed prompt. NO people/faces. Focus on: setting, objects, lighting, atmosphere, textures. Style: cinematic photography, shallow depth of field, warm natural lighting, film grain]`
        }],
        { model: GROK_MODELS.GROK_3, temperature: 0.7, max_tokens: 500 }
      );

      const captionMatch = promptGeneration.match(/CAPTION:\s*(.+?)(?=IMAGE_PROMPT:|$)/s);
      const imagePromptMatch = promptGeneration.match(/IMAGE_PROMPT:\s*(.+)/s);

      caption = captionMatch?.[1]?.trim() || "";
      imagePrompt = imagePromptMatch?.[1]?.trim() || sceneConceptPrompt;
    }

    console.log("[Generate Image] Final prompt:", imagePrompt);

    // Generate the image
    const startTime = Date.now();
    const imageResponse = await grokGenerateImage({
      prompt: imagePrompt,
      response_format: "url",
    });
    const duration = Date.now() - startTime;

    const imageUrl = imageResponse.data[0]?.url || null;

    return NextResponse.json({
      imageUrl,
      caption,
      prompt: imagePrompt,
      duration_ms: duration,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image generation failed" },
      { status: 500 }
    );
  }
}

