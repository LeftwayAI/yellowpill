import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { DevPanel } from "@/components/DevPanel";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yellow Pill",
  description: "AI that actually knows you",
  metadataBase: new URL("https://yellowpill.app"),
  icons: {
    icon: "/images/assets/yellow_pill_logo.svg",
    apple: "/images/assets/yellow_pill_logo.png",
  },
  openGraph: {
    title: "Yellow Pill",
    description: "AI that actually knows you",
    siteName: "Yellow Pill",
    type: "website",
    locale: "en_US",
    url: "https://yellowpill.app",
    images: [
      {
        url: "/images/assets/og.png",
        width: 1200,
        height: 630,
        alt: "Yellow Pill - AI that actually knows you",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Yellow Pill",
    description: "AI that actually knows you",
    images: ["/images/assets/og.png"],
    creator: "@yellowpillapp",
  },
  robots: {
    index: true,
    follow: true,
  },
  keywords: ["AI", "personal AI", "feed", "self-improvement", "Yellow Pill"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Satoshi Variable font from Fontshare */}
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${GeistMono.variable} antialiased`}>
        {children}
        <DevPanel />
      </body>
    </html>
  );
}
