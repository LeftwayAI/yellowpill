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
  },
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
