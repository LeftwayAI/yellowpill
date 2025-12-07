"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function TermsOfService() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 bg-black">
      <div
        className={`max-w-2xl w-full ${
          mounted ? "animate-fade-in" : "opacity-0"
        }`}
      >
        {/* Header */}
        <Link href="/" className="inline-flex items-center gap-3 mb-12">
          <Image
            src="/images/assets/yellow_pill_logo.png"
            alt="Yellow Pill"
            width={32}
            height={32}
          />
          <span className="text-[var(--foreground-muted)] text-sm">Back</span>
        </Link>

        <h1 className="text-3xl font-medium text-white mb-8 tracking-tight">
          Terms of Service
        </h1>

        <div className="space-y-8 text-[var(--foreground-muted)]">
          <section>
            <h2 className="text-xl font-medium text-white mb-3">1. Acceptance of Terms</h2>
            <p className="leading-relaxed">
              By accessing or using Yellow Pill, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-3">2. Description of Service</h2>
            <p className="leading-relaxed">
              Yellow Pill provides a personalized content feed experience. We analyze your preferences 
              to curate content that aligns with your interests and goals.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-3">3. User Accounts</h2>
            <p className="leading-relaxed">
              You may be required to create an account to access certain features. You are responsible 
              for maintaining the confidentiality of your account credentials and for all activities 
              that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-3">4. User Conduct</h2>
            <p className="leading-relaxed">
              You agree not to use the service for any unlawful purpose or in any way that could damage, 
              disable, or impair the service. You will not attempt to gain unauthorized access to any 
              part of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-3">5. Intellectual Property</h2>
            <p className="leading-relaxed">
              All content, features, and functionality of Yellow Pill are owned by us and are protected 
              by intellectual property laws. You may not reproduce, distribute, or create derivative 
              works without our express permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-3">6. Disclaimer of Warranties</h2>
            <p className="leading-relaxed">
              The service is provided &quot;as is&quot; without warranties of any kind, either express or implied. 
              We do not guarantee that the service will be uninterrupted, secure, or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-3">7. Limitation of Liability</h2>
            <p className="leading-relaxed">
              To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, 
              special, consequential, or punitive damages resulting from your use of or inability to use 
              the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-3">8. Changes to Terms</h2>
            <p className="leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify users of any 
              material changes. Your continued use of the service after such modifications constitutes 
              acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-3">9. Contact</h2>
            <p className="leading-relaxed">
              If you have any questions about these Terms of Service, please contact us.
            </p>
          </section>

          <p className="text-sm text-[var(--foreground-subtle)] pt-8 border-t border-[var(--border)]">
            Last updated: December 2024
          </p>
        </div>
      </div>
    </main>
  );
}

