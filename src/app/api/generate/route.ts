import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { SoulManifest } from "@/types/manifest";
import type { Poster, PostType } from "@/types/database";
import { generateSoulSummaries, getRandomSoulSummary, type SoulSummaries } from "@/lib/soul-summary";
import { runGenerationPipeline } from "@/lib/generation-pipeline";
import { needsSpecialHandler, runSpecialPoster } from "@/lib/special-posters";

// How many posts to generate per request
const POSTS_TO_GENERATE = 5;

// Similarity threshold - posts with higher overlap will be skipped
const SIMILARITY_THRESHOLD = 0.35;

// Common words to ignore in similarity check
const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "must", "shall", "can", "need", "dare",
  "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by",
  "from", "as", "into", "through", "during", "before", "after", "above",
  "below", "between", "under", "again", "further", "then", "once", "here",
  "there", "when", "where", "why", "how", "all", "each", "few", "more",
  "most", "other", "some", "such", "no", "nor", "not", "only", "own",
  "same", "so", "than", "too", "very", "just", "and", "but", "if", "or",
  "because", "until", "while", "this", "that", "these", "those", "it",
  "its", "you", "your", "yours", "yourself", "he", "him", "his", "she",
  "her", "hers", "we", "our", "ours", "they", "them", "their", "what",
  "which", "who", "whom", "i", "me", "my", "myself", "about", "like",
  "dont", "youre", "youve", "youll", "thats", "theyre", "weve", "ive",
]);

// Extract meaningful keywords from text
function extractKeywords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Remove punctuation
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));
  return new Set(words);
}

// Calculate Jaccard similarity between two keyword sets
function calculateSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 || set2.size === 0) return 0;
  
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

// Check if new content is too similar to any existing content
function isTooSimilar(
  newContent: string,
  existingContents: string[],
  threshold: number = SIMILARITY_THRESHOLD
): { isDuplicate: boolean; maxSimilarity: number; matchedWith?: string } {
  const newKeywords = extractKeywords(newContent);
  let maxSimilarity = 0;
  let matchedWith: string | undefined;

  for (const existing of existingContents) {
    const existingKeywords = extractKeywords(existing);
    const similarity = calculateSimilarity(newKeywords, existingKeywords);
    
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      matchedWith = existing.substring(0, 50) + "...";
    }
  }

  return {
    isDuplicate: maxSimilarity > threshold,
    maxSimilarity,
    matchedWith,
  };
}

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

    // Get recent posts to avoid repetition (both poster and content)
    const { data: recentPosts } = await supabase
      .from("posts")
      .select("poster_id, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20); // Fetch more for content dedup

    const recentPosterIds = recentPosts?.map((p) => p.poster_id).slice(0, 3) || [];
    const recentContents = recentPosts?.map((p) => p.content) || [];

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

      // Check for similarity against recent posts AND posts we're about to insert
      const allRecentContents = [
        ...recentContents,
        ...generatedPosts.map((p) => p.content),
      ];
      
      const similarityCheck = isTooSimilar(content, allRecentContents);
      
      if (similarityCheck.isDuplicate) {
        console.log(
          `[Generate] Post ${i + 1} SKIPPED - too similar (${(similarityCheck.maxSimilarity * 100).toFixed(0)}% overlap)`
        );
        // Don't add to generated posts, but still track poster to avoid repetition
        recentPosterIds.unshift(poster.id);
        continue;
      }

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
    const skippedCount = POSTS_TO_GENERATE - generatedPosts.length;
    console.log(
      `[Generate] ${generatedPosts.length}/${POSTS_TO_GENERATE} posts kept (${skippedCount} skipped as duplicates) in ${totalDuration}ms`
    );

    // Insert posts (if any passed the similarity check)
    if (generatedPosts.length > 0) {
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
    }

    // Log generation (skipped count logged to console only)
    await supabase.from("generation_log").insert({
      user_id: userId,
      posts_generated: generatedPosts.length,
    });

    return NextResponse.json({
      success: true,
      generated: generatedPosts.length,
      skipped_duplicates: skippedCount,
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
