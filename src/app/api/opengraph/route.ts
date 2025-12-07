import { NextRequest, NextResponse } from "next/server";

// Simple in-memory cache for OpenGraph data (would use Redis in production)
const ogCache = new Map<string, { data: OpenGraphData; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

interface OpenGraphData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  try {
    // Check cache
    const cached = ogCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; YellowPillBot/1.0)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();

    // Parse OpenGraph tags
    const ogData: OpenGraphData = {
      url,
      title: extractMeta(html, "og:title") || extractMeta(html, "twitter:title") || extractTitle(html),
      description: extractMeta(html, "og:description") || extractMeta(html, "twitter:description") || extractMeta(html, "description"),
      image: extractMeta(html, "og:image") || extractMeta(html, "twitter:image"),
      siteName: extractMeta(html, "og:site_name") || new URL(url).hostname.replace("www.", ""),
      favicon: extractFavicon(html, url),
    };

    // Make image URL absolute if relative
    if (ogData.image && !ogData.image.startsWith("http")) {
      const baseUrl = new URL(url);
      ogData.image = new URL(ogData.image, baseUrl.origin).toString();
    }

    // Cache the result
    ogCache.set(url, { data: ogData, timestamp: Date.now() });

    return NextResponse.json(ogData);
  } catch (error) {
    console.error("[OpenGraph] Error fetching:", url, error);
    
    // Return minimal data on error
    return NextResponse.json({
      url,
      siteName: new URL(url).hostname.replace("www.", ""),
    });
  }
}

function extractMeta(html: string, property: string): string | undefined {
  // Try property attribute (OpenGraph style)
  let match = html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"));
  if (match) return decodeHtmlEntities(match[1]);

  // Try name attribute (standard meta style)
  match = html.match(new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"));
  if (match) return decodeHtmlEntities(match[1]);

  // Try content before property/name (some sites do this)
  match = html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`, "i"));
  if (match) return decodeHtmlEntities(match[1]);

  return undefined;
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].trim()) : undefined;
}

function extractFavicon(html: string, url: string): string {
  // Try to find favicon in HTML
  const match = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);
  if (match) {
    const favicon = match[1];
    if (favicon.startsWith("http")) return favicon;
    return new URL(favicon, new URL(url).origin).toString();
  }
  
  // Default to /favicon.ico
  return new URL("/favicon.ico", new URL(url).origin).toString();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

