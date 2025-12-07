import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { SoulManifest } from "@/types/manifest";
import type { Poster, PostType } from "@/types/database";
import { generateSoulSummaries, getRandomSoulSummary, type SoulSummaries } from "@/lib/soul-summary";
import { runGenerationPipeline } from "@/lib/generation-pipeline";
import { needsSpecialHandler, runSpecialPoster } from "@/lib/special-posters";

// How many posts to generate per request
const POSTS_TO_GENERATE = 5;

// Select which poster to generate from
function selectPoster(posters: Poster[], recentPosterIds: string[]): Poster {
  // Weight by: hasn't posted recently + randomness
  const candidates = posters.filter((p) => p.is_active);

  // Prefer posters that haven't posted recently
  const notRecent = candidates.filter((p) => !recentPosterIds.includes(p.id));
  const pool = notRecent.length > 0 ? notRecent : candidates;

  // Random selection
  return pool[Math.floor(Math.random() * pool.length)];
}

// Select which post type to use
function selectPostType(poster: Poster): PostType {
  const types = poster.post_types;
  return types[Math.floor(Math.random() * types.length)];
}

export async function POST(request: Request) {
  try {
    // Use service client to bypass RLS for generation
    const supabase = createServiceClient();
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Get user's manifest and soul summaries
    const { data: manifestData, error: manifestError } = await supabase
      .from("soul_manifests")
      .select("manifest, soul_summaries")
      .eq("user_id", userId)
      .single();
    
    if (process.env.NODE_ENV === "development" && manifestError) {
      console.log("Manifest fetch error:", manifestError);
    }

    if (manifestError || !manifestData) {
      return NextResponse.json({ error: "Manifest not found" }, { status: 404 });
    }

    const manifest = manifestData.manifest as unknown as SoulManifest;
    let soulSummaries = manifestData.soul_summaries as SoulSummaries | null;

    // Generate soul summaries if they don't exist
    if (!soulSummaries) {
      console.log("[Generate] No soul summaries found, generating...");
      soulSummaries = await generateSoulSummaries(manifest);
      
      // Store them for future use
      await supabase
        .from("soul_manifests")
        .update({ soul_summaries: soulSummaries })
        .eq("user_id", userId);
      
      console.log("[Generate] Soul summaries generated and stored");
    }

    // Get all active posters
    const { data: postersData, error: postersError } = await supabase
      .from("posters")
      .select("*")
      .eq("is_active", true);

    if (postersError || !postersData?.length) {
      return NextResponse.json({ error: "No posters found" }, { status: 404 });
    }

    // Cast posters to proper type
    const posters = postersData.map((p) => ({
      ...p,
      post_types: p.post_types as unknown as PostType[],
    })) as Poster[];

    // Get recent posts to avoid repetition
    const { data: recentPosts } = await supabase
      .from("posts")
      .select("poster_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3);

    const recentPosterIds = recentPosts?.map((p) => p.poster_id) || [];

    // Generate posts using the pipeline
    const generatedPosts: Array<{
      user_id: string;
      poster_id: string;
      post_type: string;
      content: string;
      image_url?: string | null;
      manifest_fields_used: string[];
    }> = [];

    console.log(`[Generate] Starting generation of ${POSTS_TO_GENERATE} posts...`);
    const totalStart = Date.now();

    for (let i = 0; i < POSTS_TO_GENERATE; i++) {
      const poster = selectPoster(posters, recentPosterIds);
      const postType = selectPostType(poster);

      // Get a random soul summary angle for variety
      const { angle, summary } = getRandomSoulSummary(soulSummaries);
      console.log(`[Generate] Post ${i + 1}: ${poster.name} / ${postType.type} (soul angle: ${angle})`);

      let content: string;
      let imageUrl: string | null | undefined;

      // Check if this poster needs special handling
      if (needsSpecialHandler(poster.id)) {
        console.log(`[Generate] Using special handler for ${poster.id}`);
        const specialResult = await runSpecialPoster(poster, postType, summary);
        content = specialResult.content;
        imageUrl = specialResult.imageUrl;
      } else {
        // Run the standard multi-step pipeline
        const result = await runGenerationPipeline(poster, postType, summary);
        content = result.content;
        console.log(`[Generate] Concept: "${result.selected_concept}"`);
      }

      console.log(`[Generate] Post ${i + 1} complete`);

      // Track which fields were used
      const manifestFieldsUsed = postType.manifest_fields;

      generatedPosts.push({
        user_id: userId,
        poster_id: poster.id,
        post_type: postType.type,
        content,
        image_url: imageUrl,
        manifest_fields_used: manifestFieldsUsed,
      });

      // Add to recent to avoid same poster twice in a row
      recentPosterIds.unshift(poster.id);
    }

    const totalDuration = Date.now() - totalStart;
    console.log(`[Generate] All ${POSTS_TO_GENERATE} posts generated in ${totalDuration}ms (avg: ${Math.round(totalDuration / POSTS_TO_GENERATE)}ms each)`);

    // Insert all posts
    const { error: insertError } = await supabase
      .from("posts")
      .insert(generatedPosts);

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save posts" },
        { status: 500 }
      );
    }

    // Log generation
    await supabase.from("generation_log").insert({
      user_id: userId,
      posts_generated: generatedPosts.length,
    });

    return NextResponse.json({
      success: true,
      generated: generatedPosts.length,
      total_duration_ms: totalDuration,
    });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: "Failed to generate posts" },
      { status: 500 }
    );
  }
}
