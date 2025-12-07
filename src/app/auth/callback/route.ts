import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get user and session
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check if user has a manifest
        const { data: manifest } = await supabase
          .from("soul_manifests")
          .select("id")
          .eq("user_id", user.id)
          .single();

        // If no manifest, redirect to intake
        if (!manifest) {
          // Check if this is an X (Twitter) auth - we'll have provider data
          const isXAuth = user.app_metadata?.provider === "twitter";
          
          if (isXAuth) {
            // Extract X profile data and store for intake
            const xProfile = {
              username: user.user_metadata?.preferred_username || user.user_metadata?.user_name,
              name: user.user_metadata?.full_name || user.user_metadata?.name,
              bio: user.user_metadata?.description,
              location: user.user_metadata?.location,
              profileImage: user.user_metadata?.avatar_url || user.user_metadata?.picture,
              // Note: More data would require API calls with the access token
            };
            
            console.log("[Auth] X profile extracted:", xProfile);
            
            // Store X profile data in a cookie for intake to use
            const response = NextResponse.redirect(`${origin}/intake`);
            response.cookies.set("x_profile", JSON.stringify(xProfile), {
              httpOnly: false, // Need client-side access
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 60 * 60, // 1 hour
            });
            return response;
          }
          
          return NextResponse.redirect(`${origin}/intake`);
        }
        
        return NextResponse.redirect(`${origin}/feed`);
      }
    }
  }

  // Something went wrong, redirect to login
  return NextResponse.redirect(`${origin}/login`);
}

