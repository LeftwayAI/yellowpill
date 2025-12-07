import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * Pre-generation endpoint - called partway through onboarding
 * to warm up post generation so the feed is ready when the user arrives.
 * 
 * This is a fire-and-forget optimization. The final intake submission
 * will complete the manifest and trigger the real generation if needed.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ status: "skipped", reason: "no_user" })
    }

    const { partialAnswers } = await request.json()

    // Check if we already have posts for this user
    const { count } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)

    if (count && count > 0) {
      // Posts already exist, no need to pre-generate
      return NextResponse.json({ status: "skipped", reason: "posts_exist" })
    }

    // Log this pre-generation attempt for tracking
    console.log(`[Pre-generate] User ${user.id} - warming up with ${Object.keys(partialAnswers || {}).length} answers`)

    // For now, we just log the intent. The actual post generation happens
    // after the full manifest is saved in the main intake route.
    // 
    // A more advanced implementation could:
    // 1. Save a partial manifest
    // 2. Trigger generation with available data
    // 3. The final intake would update/regenerate with full data
    //
    // For now, this endpoint exists as a placeholder for future optimization

    return NextResponse.json({ 
      status: "acknowledged",
      message: "Pre-generation request received. Full generation happens after intake completion."
    })

  } catch (error) {
    console.error("[Pre-generate] Error:", error)
    // Don't fail the user experience - this is just an optimization
    return NextResponse.json({ status: "error" }, { status: 200 })
  }
}

