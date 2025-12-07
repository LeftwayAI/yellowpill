"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function PrivacyPolicy() {
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
          Privacy Policy
        </h1>

        <div className="space-y-8 text-[var(--foreground-muted)]">
          <section>
            <h2 className="text-xl font-medium text-white mb-3">1. Information We Collect</h2>
            <p className="leading-relaxed mb-4">
              We collect information you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Account information (email, username)</li>
              <li>Profile data you choose to share</li>
              <li>Your preferences and interests</li>
              <li>Content you interact with</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-3">2. How We Use Your Information</h2>
            <p className="leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide and personalize our services</li>
              <li>Curate content tailored to your interests</li>
              <li>Improve and develop new features</li>
              <li>Communicate with you about the service</li>
              <li>Ensure security and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-3">3. Information Sharing</h2>
            <p className="leading-relaxed">
              We do not sell your personal information. We may share information with third parties 
              only in the following circumstances: with your consent, to comply with legal obligations, 
              to protect our rights, or with service providers who assist in operating our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-3">4. Data Security</h2>
            <p className="leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal 
              information against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-3">5. Data Retention</h2>
            <p className="leading-relaxed">
              We retain your information for as long as your account is active or as needed to provide 
              you services. You can request deletion of your data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-3">6. Your Rights</h2>
            <p className="leading-relaxed mb-4">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your data</li>
              <li>Object to processing</li>
              <li>Data portability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-3">7. Cookies and Tracking</h2>
            <p className="leading-relaxed">
              We use cookies and similar technologies to maintain your session, remember your preferences, 
              and understand how you use our service. You can control cookie settings through your browser.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-3">8. Third-Party Services</h2>
            <p className="leading-relaxed">
              Our service may contain links to third-party websites or integrate with third-party services. 
              This privacy policy does not apply to those services, and we encourage you to review their 
              privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-3">9. Changes to This Policy</h2>
            <p className="leading-relaxed">
              We may update this privacy policy from time to time. We will notify you of any material 
              changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-3">10. Contact Us</h2>
            <p className="leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us.
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

