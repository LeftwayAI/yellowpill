"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface UserInfo {
  avatarUrl: string | null;
  name: string | null;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);

    // Check if user is logged in
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        // Check if they have a manifest (completed intake)
        const { data: manifest } = await supabase
          .from("soul_manifests")
          .select("id")
          .eq("user_id", authUser.id)
          .single();

        if (manifest) {
          // Has manifest, redirect to feed
          router.push("/feed");
          return;
        }

        // Logged in but no manifest - show logout option
        setUser({
          avatarUrl: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
        });
      }
    };

    checkUser();
  }, [router]);

  const handlePillClick = () => {
    if (user) {
      // User is logged in, go to intake
      router.push("/intake");
    } else {
      router.push("/login");
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setLoggingOut(false);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-black">
      {/* Logged in user header */}
      {user && (
        <div className="absolute top-6 flex flex-col items-center gap-2 animate-fade-in">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name || "Profile"}
              className="w-12 h-12 rounded-full border-2 border-[#333]"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#222] border-2 border-[#333] flex items-center justify-center">
              <svg
                className="w-6 h-6 text-[var(--foreground-muted)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-sm text-[var(--foreground-subtle)] hover:text-[var(--foreground-muted)] transition-colors"
          >
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      )}

      <div
        className={`max-w-md w-full flex flex-col items-center text-center ${mounted ? "animate-fade-in" : "opacity-0"
          }`}
      >
        {/* Copy */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium text-white mb-2 tracking-tight">
          {user ? "Welcome back." : "Be your best self."}
        </h1>
        <p className="text-[var(--foreground-muted)] text-xl md:text-3xl mb-12">
          {user ? "Let's finish getting to know you." : "It's time to take the yellow pill."}
        </p>

        {/* Clickable Pill */}
        <button
          onClick={handlePillClick}
          className="mb-16 animate-float cursor-pointer transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--yellow-primary)] focus-visible:ring-offset-4 focus-visible:ring-offset-black rounded-full"
          aria-label={user ? "Continue to intake" : "Continue to login"}
        >
          <Image
            src="/images/assets/yellow_pill_logo.png"
            alt="Yellow Pill"
            width={120}
            height={120}
            priority
            className="drop-shadow-[0_0_30px_rgba(252,200,0,0.3)]"
          />
        </button>
      </div>

      {/* Footer Links */}
      <footer className="absolute bottom-6 flex gap-6 text-sm text-[var(--foreground-subtle)]">
        <Link href="/terms" className="hover:text-[var(--foreground-muted)] transition-colors">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-[var(--foreground-muted)] transition-colors">
          Privacy
        </Link>
      </footer>
    </main>
  );
}
