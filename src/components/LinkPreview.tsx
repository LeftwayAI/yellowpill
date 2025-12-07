"use client";

import { useState, useEffect } from "react";

interface OpenGraphData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

interface LinkPreviewProps {
  url: string;
  accentColor?: string;
}

export function LinkPreview({ url, accentColor = "#FCC800" }: LinkPreviewProps) {
  const [data, setData] = useState<OpenGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchOG = async () => {
      try {
        const response = await fetch(`/api/opengraph?url=${encodeURIComponent(url)}`);
        if (response.ok) {
          const ogData = await response.json();
          setData(ogData);
        }
      } catch (error) {
        console.error("[LinkPreview] Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOG();
  }, [url]);

  const hostname = new URL(url).hostname.replace("www.", "");
  const isX = hostname === "x.com" || hostname === "twitter.com";
  const isGrokipedia = hostname === "grokipedia.com";

  if (loading) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-3 rounded-xl border border-[#333] overflow-hidden bg-[#111] animate-pulse"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-32 bg-[#222]" />
        <div className="p-3 space-y-2">
          <div className="h-4 bg-[#222] rounded w-3/4" />
          <div className="h-3 bg-[#222] rounded w-1/2" />
        </div>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block mt-3 rounded-xl border border-[#333] overflow-hidden bg-[#111] hover:border-[#444] transition-colors"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Image */}
      {data?.image && !imageError && (
        <div className="relative aspect-[1.91/1] bg-[#1a1a1a] overflow-hidden">
          <img
            src={data.image}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        {/* Site info row */}
        <div className="flex items-center gap-2 mb-1">
          {/* Favicon or site icon */}
          {isX ? (
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          ) : isGrokipedia ? (
            <span className="text-sm">📚</span>
          ) : data?.favicon ? (
            <img
              src={data.favicon}
              alt=""
              className="w-4 h-4 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <svg className="w-4 h-4 text-[var(--foreground-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          )}
          <span className="text-[13px] text-[var(--foreground-muted)]">
            {data?.siteName || hostname}
          </span>
          {/* External link icon */}
          <svg className="w-3 h-3 text-[var(--foreground-subtle)] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>

        {/* Title */}
        {data?.title && (
          <h4 className="text-[15px] font-medium text-[var(--foreground)] line-clamp-2 leading-snug">
            {data.title}
          </h4>
        )}

        {/* Description */}
        {data?.description && (
          <p className="text-[13px] text-[var(--foreground-muted)] line-clamp-2 mt-1 leading-relaxed">
            {data.description}
          </p>
        )}
      </div>
    </a>
  );
}

// Helper to extract URLs from text
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  return text.match(urlRegex) || [];
}

// Helper to render text with link previews extracted
export function removeUrlsFromText(text: string): string {
  // Remove URLs that are on their own line
  return text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      // Keep line if it's not just a URL
      return !trimmed.match(/^https?:\/\/[^\s]+$/);
    })
    .join("\n")
    .trim();
}

