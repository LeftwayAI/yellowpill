import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const IS_DEV = process.env.NODE_ENV === "development";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // In development, check for dev mode cookie/header bypass
  if (IS_DEV) {
    const devModeCookie = request.cookies.get("yellowpill_dev_mode");
    if (devModeCookie?.value === "true") {
      // Dev mode is enabled, skip auth checks
      return supabaseResponse;
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ["/feed", "/intake", "/manifest"];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user is authenticated and on login page, redirect to feed or intake
  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    // Check if user has completed intake (has manifest)
    // For now, just redirect to feed - we'll check manifest status there
    url.pathname = "/feed";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse;
}
