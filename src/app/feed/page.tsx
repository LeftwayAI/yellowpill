"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isDevModeEnabled, TEST_MANIFEST, TEST_POSTS, POSTER_COLORS } from "@/lib/dev-auth";
import { Header } from "@/components/Header";

interface PosterInfo {
  id: string;
  name: string;
  avatar_gradient: string;
  tagline: string;
  accent_color?: string;
}

interface FeedPost {
  id: string;
  user_id: string;
  poster_id: string;
  post_type: string;
  content: string;
  manifest_fields_used: string[] | null;
  seen: boolean;
  seen_at: string | null;
  feedback: "up" | "down" | null;
  created_at: string;
  poster: PosterInfo;
}

export default function FeedPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [thought, setThought] = useState("");

  useEffect(() => {
    const loadFeed = async () => {
      // Check for dev mode
      if (isDevModeEnabled()) {
        setUserName(TEST_MANIFEST.identity.name || "");
        setPosts(TEST_POSTS as FeedPost[]);
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Check for manifest
      const { data: manifestData } = await supabase
        .from("soul_manifests")
        .select("manifest")
        .eq("user_id", user.id)
        .single();

      if (!manifestData) {
        router.push("/intake");
        return;
      }

      // Get user name from manifest
      const manifest = manifestData.manifest as { identity?: { name?: string } };
      setUserName(manifest?.identity?.name || "");

      // Fetch feed
      const response = await fetch("/api/feed");
      if (response.ok) {
        const data = await response.json();
        const feedPosts = data.posts || [];
        
        // If no posts, trigger generation
        if (feedPosts.length === 0) {
          console.log("No posts found, generating...");
          try {
            const genResponse = await fetch("/api/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user.id }),
            });
            
            if (genResponse.ok) {
              // Fetch feed again to get new posts
              const newFeedResponse = await fetch("/api/feed");
              if (newFeedResponse.ok) {
                const newData = await newFeedResponse.json();
                setPosts(newData.posts || []);
              }
            }
          } catch (err) {
            console.error("Failed to generate posts:", err);
          }
        } else {
          setPosts(feedPosts);
        }
      }

      setLoading(false);
    };

    loadFeed();
  }, [router]);

  const handleFeedback = async (postId: string, feedback: "up" | "down") => {
    if (isDevModeEnabled()) {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, feedback } : p))
      );
      return;
    }

    const supabase = createClient();
    await supabase.from("posts").update({ feedback }).eq("id", postId);

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, feedback } : p))
    );
  };

  const markAsSeen = useCallback(async (postId: string) => {
    if (isDevModeEnabled()) return;

    const supabase = createClient();
    await supabase
      .from("posts")
      .update({ seen: true, seen_at: new Date().toISOString() })
      .eq("id", postId);
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-2 border-[#FCC800] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-20 bg-black">
      <Header userName={userName} />

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {/* What's on your mind */}
        <div className="card">
          <textarea
            value={thought}
            onChange={(e) => setThought(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            className="w-full bg-transparent border-0 p-0 resize-none text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:ring-0 focus:shadow-none"
            style={{ boxShadow: 'none' }}
          />
        </div>

        {/* Feed */}
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--foreground-muted)]">
              Your feed is being generated...
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary mt-4"
            >
              Refresh
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                onFeedback={handleFeedback}
                onSeen={markAsSeen}
                delay={index * 0.05}
                formatTimeAgo={formatTimeAgo}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

interface PostCardProps {
  post: FeedPost;
  onFeedback: (id: string, feedback: "up" | "down") => void;
  onSeen: (id: string) => void;
  delay: number;
  formatTimeAgo: (date: string) => string;
}

function PostCard({ post, onFeedback, onSeen, delay, formatTimeAgo }: PostCardProps) {
  const [hasSeen, setHasSeen] = useState(post.seen);
  
  // Get accent color for this poster
  const accentColor = post.poster.accent_color || POSTER_COLORS[post.poster_id] || "#FCC800";

  useEffect(() => {
    if (!hasSeen) {
      const timer = setTimeout(() => {
        onSeen(post.id);
        setHasSeen(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasSeen, post.id, onSeen]);

  return (
    <div
      className="card animate-slide-up"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Poster header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: accentColor }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-medium text-sm text-white">
              {post.poster.name}
            </span>
            {/* Verified badge - uses poster accent color */}
            <span 
              className="inline-flex items-center justify-center w-4 h-4 rounded-full ml-1"
              style={{ background: accentColor }}
            >
              <svg className="w-2.5 h-2.5 text-black" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </span>
            <span className="text-[var(--foreground-subtle)] text-sm ml-1">
              · {formatTimeAgo(post.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="text-[var(--foreground)] leading-relaxed text-[15px]">
        {post.content}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-1 mt-4 pt-3 border-t border-[#222]">
        <ActionButton
          active={post.feedback === "down"}
          activeColor="text-red-400"
          onClick={() => onFeedback(post.id, "down")}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
            />
          </svg>
        </ActionButton>
        <ActionButton
          active={post.feedback === "up"}
          activeColor="text-green-400"
          onClick={() => onFeedback(post.id, "up")}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
            />
          </svg>
        </ActionButton>
        <ActionButton>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        </ActionButton>
        <div className="flex-1" />
        <ActionButton accentColor={accentColor}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </ActionButton>
      </div>
    </div>
  );
}

interface ActionButtonProps {
  children: React.ReactNode;
  active?: boolean;
  activeColor?: string;
  accentColor?: string;
  onClick?: () => void;
}

function ActionButton({
  children,
  active,
  activeColor = "text-[#FCC800]",
  accentColor,
  onClick,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${
        active
          ? activeColor
          : "text-[var(--foreground-subtle)] hover:text-[var(--foreground-muted)] hover:bg-[#111]"
      }`}
      style={accentColor && !active ? { color: accentColor } : undefined}
    >
      {children}
    </button>
  );
}
