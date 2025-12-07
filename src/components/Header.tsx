"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isDevModeEnabled, TEST_USER } from "@/lib/dev-auth";

interface HeaderProps {
  showProfile?: boolean;
  userName?: string;
}

export function Header({ showProfile = true, userName }: HeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    if (!isDevModeEnabled()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    // Clear dev mode
    localStorage.removeItem("yellowpill_dev_mode");
    document.cookie = "yellowpill_dev_mode=; path=/; max-age=0";
    router.push("/");
  };

  const displayName = isDevModeEnabled() 
    ? TEST_USER.email.split("@")[0] 
    : (userName || "User");

  return (
    <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-lg border-b border-[#222]">
      <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Image
            src="/images/assets/yellow_pill_logo.png"
            alt="Yellow Pill"
            width={28}
            height={28}
            className="drop-shadow-[0_0_10px_rgba(252,200,0,0.3)] cursor-pointer"
            onClick={() => router.push("/feed")}
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Points badge */}
          <span className="text-sm text-[var(--foreground-muted)] bg-[#111] px-3 py-1 rounded-full border border-[#222]">
            525
          </span>

          {/* Profile menu */}
          {showProfile && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-8 h-8 rounded-full bg-[#222] border border-[#333] flex items-center justify-center hover:border-[#444] transition-colors"
              >
                <svg
                  className="w-4 h-4 text-[var(--foreground-muted)]"
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
              </button>

              {/* Dropdown */}
              {menuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  
                  {/* Menu */}
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#111] border border-[#222] rounded-xl shadow-xl z-50 overflow-hidden">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-[#222]">
                      <p className="text-sm font-medium text-white truncate">
                        {displayName}
                      </p>
                      {isDevModeEnabled() && (
                        <p className="text-xs text-[#FCC800] mt-0.5">Dev Mode</p>
                      )}
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          router.push("/manifest");
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-[var(--foreground-muted)] hover:bg-[#1a1a1a] hover:text-white transition-colors"
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-[var(--foreground-muted)] hover:bg-[#1a1a1a] hover:text-white transition-colors"
                      >
                        Log out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

