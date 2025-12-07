"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePillClick = () => {
    router.push("/login");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-black">
      <div
        className={`max-w-md w-full flex flex-col items-center text-center ${
          mounted ? "animate-fade-in" : "opacity-0"
        }`}
      >
        {/* Copy */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium text-white mb-4 tracking-tight">
          Are you ready?
        </h1>
        <p className="text-[var(--foreground-muted)] text-lg mb-12">
          It&apos;s time to take the yellow pill.
        </p>

        {/* Clickable Pill */}
        <button
          onClick={handlePillClick}
          className="mb-16 animate-float cursor-pointer transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--yellow-primary)] focus-visible:ring-offset-4 focus-visible:ring-offset-black rounded-full"
          aria-label="Continue to login"
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
