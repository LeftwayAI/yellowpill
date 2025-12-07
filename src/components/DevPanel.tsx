"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Only show in development
const IS_DEV = process.env.NODE_ENV === "development";

// Test user for development
const TEST_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "test@yellowpill.dev",
};

// Set cookie for middleware to read
function setDevModeCookie(enabled: boolean) {
  if (enabled) {
    document.cookie = "yellowpill_dev_mode=true; path=/; max-age=86400";
  } else {
    document.cookie = "yellowpill_dev_mode=; path=/; max-age=0";
  }
}

// Real user ID for testing generation (from your manifest)
const REAL_USER_ID = "d041dda8-4daf-4465-83a0-32b566234294";

export function DevPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [devMode, setDevMode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);

  useEffect(() => {
    // Check if dev mode is enabled
    const storedDevMode = localStorage.getItem("yellowpill_dev_mode");
    const isEnabled = storedDevMode === "true";
    setDevMode(isEnabled);
    
    // Sync cookie with localStorage
    setDevModeCookie(isEnabled);

    // Get current user
    const checkUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setCurrentUser(data.user?.email || null);
    };
    checkUser();
  }, []);

  const generatePosts = async () => {
    setGenerating(true);
    setGenResult(null);
    
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: REAL_USER_ID }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setGenResult(`✓ Generated ${data.generated} posts`);
        // Auto-navigate to feed after 1 second
        setTimeout(() => {
          window.location.href = "/feed";
        }, 1000);
      } else {
        setGenResult(`✗ ${data.error}`);
      }
    } catch (err) {
      setGenResult(`✗ ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setGenerating(false);
    }
  };

  if (!IS_DEV) return null;

  const toggleDevMode = () => {
    const newValue = !devMode;
    setDevMode(newValue);
    localStorage.setItem("yellowpill_dev_mode", String(newValue));
    setDevModeCookie(newValue);
    window.location.reload();
  };

  const clearLocalData = () => {
    localStorage.clear();
    setDevModeCookie(false);
    window.location.reload();
  };

  const goTo = (path: string) => {
    window.location.href = path;
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-[9999] w-10 h-10 bg-[#1a1a1a] border border-[#333] rounded-lg flex items-center justify-center hover:bg-[#222] transition-colors"
        title="Dev Panel"
      >
        <svg
          className="w-5 h-5 text-[#FCC800]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 z-[9999] w-72 bg-[#0a0a0a] border border-[#333] rounded-xl shadow-2xl overflow-hidden font-mono text-xs">
          {/* Header */}
          <div className="bg-[#1a1a1a] px-4 py-3 border-b border-[#333] flex items-center justify-between">
            <span className="text-[#FCC800] font-semibold">Dev Panel</span>
            <span className="text-[#666]">v0.1.0</span>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Status */}
            <div className="space-y-2">
              <div className="text-[#666] uppercase tracking-wider text-[10px]">
                Status
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#999]">User:</span>
                <span className="text-white truncate max-w-[140px]">
                  {devMode ? TEST_USER.email : (currentUser || "None")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#999]">Dev Mode:</span>
                <span className={devMode ? "text-green-400" : "text-red-400"}>
                  {devMode ? "ON" : "OFF"}
                </span>
              </div>
            </div>

            {/* Quick Nav */}
            <div className="space-y-2">
              <div className="text-[#666] uppercase tracking-wider text-[10px]">
                Navigation
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Home", path: "/" },
                  { label: "Login", path: "/login" },
                  { label: "Intake", path: "/intake" },
                  { label: "Feed", path: "/feed" },
                ].map((item) => (
                  <button
                    key={item.path}
                    onClick={() => goTo(item.path)}
                    className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded text-white transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <div className="text-[#666] uppercase tracking-wider text-[10px]">
                Actions
              </div>
              <button
                onClick={toggleDevMode}
                className={`w-full px-3 py-2 rounded font-medium transition-colors ${
                  devMode
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                }`}
              >
                {devMode ? "Disable Dev Mode" : "Enable Dev Mode"}
              </button>
              <button
                onClick={generatePosts}
                disabled={generating}
                className="w-full px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? "⏳ Generating..." : "🎲 Generate Posts"}
              </button>
              {genResult && (
                <div className={`text-[10px] px-2 py-1 rounded ${
                  genResult.startsWith("✓") 
                    ? "bg-green-500/10 text-green-400" 
                    : "bg-red-500/10 text-red-400"
                }`}>
                  {genResult}
                </div>
              )}
              <button
                onClick={() => {
                  localStorage.removeItem("yellowpill_intake_progress");
                  window.location.href = "/intake";
                }}
                className="w-full px-3 py-2 bg-[#FCC800]/20 hover:bg-[#FCC800]/30 text-[#FCC800] rounded font-medium transition-colors"
              >
                🔄 Re-intake
              </button>
              <button
                onClick={clearLocalData}
                className="w-full px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded text-white transition-colors"
              >
                Clear Local Data
              </button>
            </div>

            {/* Test User Info */}
            {devMode && (
              <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[#333]">
                <div className="text-[#FCC800] text-[10px] uppercase tracking-wider mb-2">
                  Dev Mode Active
                </div>
                <div className="text-[#999] text-[10px]">
                  Auth bypassed. Using test data.
                  <br />
                  <span className="text-white">{TEST_USER.email}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Export test user for use in other files
export { TEST_USER, IS_DEV };

// Hook to check if dev mode is active
export function useDevMode() {
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDevMode(localStorage.getItem("yellowpill_dev_mode") === "true");
    }
  }, []);

  return devMode && IS_DEV;
}
