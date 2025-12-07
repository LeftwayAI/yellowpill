import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get unseen posts first, then seen posts (for scrollback)
    const { data: posts, error } = await supabase
      .from("posts")
      .select(
        `
        *,
        poster:posters(id, name, avatar_gradient, tagline)
      `
      )
      .eq("user_id", user.id)
      .order("seen", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      console.error("Feed error:", error)
      return NextResponse.json(
        { error: "Failed to fetch feed" },
        { status: 500 }
      )
    }

    // Check if we need to generate more posts
    const unseenCount = posts?.filter((p) => !p.seen).length || 0
    if (unseenCount < 5) {
      // Trigger generation in background
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000")

      fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      }).catch(console.error)
    }

    return NextResponse.json({ posts })
  } catch (error) {
    console.error("Feed error:", error)
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 })
  }
}
