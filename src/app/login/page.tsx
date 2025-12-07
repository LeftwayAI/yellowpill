"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [xLoading, setXLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({
        type: "success",
        text: "Check your email for the magic link.",
      });
    }

    setLoading(false);
  };

  const handleXLogin = async () => {
    setXLoading(true);
    setMessage(null);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "twitter",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "tweet.read users.read offline.access",
      },
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setXLoading(false);
    }
    // If successful, user will be redirected
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-black">
      <div className="max-w-sm w-full space-y-8 animate-fade-in">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[var(--foreground-subtle)] hover:text-[var(--foreground-muted)] transition-colors text-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </Link>

        {/* Header */}
        <div className="text-center">
          <div className="mb-6">
            <Image
              src="/images/assets/yellow_pill_logo.png"
              alt="Yellow Pill"
              width={64}
              height={64}
              className="mx-auto drop-shadow-[0_0_20px_rgba(252,200,0,0.3)]"
            />
          </div>
          <h1 className="text-2xl font-medium text-white mb-2">Sign in</h1>
          <p className="text-[var(--foreground-muted)] text-sm">
            Enter your email. We&apos;ll send a link.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yellowpill.app"
              required
              className="w-full"
              disabled={loading}
            />
          </div>

          {message && (
            <div
              className={`p-4 rounded-xl text-sm ${message.type === "success"
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            className="btn-primary w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Sending...
              </span>
            ) : (
              "Continue"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#222]"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-4 bg-black text-[var(--foreground-subtle)]">
              or
            </span>
          </div>
        </div>

        {/* X Login */}
        <button
          onClick={handleXLogin}
          disabled={xLoading}
          className="w-full px-4 py-3 bg-white hover:bg-gray-100 border border-[#222] rounded-xl text-black font-medium flex items-center justify-center transition-colors disabled:opacity-50"
        >
          {xLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Connecting...
            </>
          ) : (
            "Continue with 𝕏"
          )}
        </button>

        <p className="text-xs text-[var(--foreground-subtle)] text-center">
          Your data stays yours. Always.
        </p>
      </div>
    </main>
  );
}
