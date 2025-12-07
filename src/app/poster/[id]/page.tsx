"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isDevModeEnabled, TEST_POSTS, POSTER_COLORS } from "@/lib/dev-auth";
import { Header } from "@/components/Header";
import { SpinningPill } from "@/components/SpinningPill";

interface Poster {
  id: string;
  name: string;
  avatar_gradient: string;
  tagline: string;
  accent_color?: string;
  system_prompt?: string;
  style_guide?: string;
}

interface Post {
  id: string;
  content: string;
  post_type: string;
  created_at: string;
  feedback: "up" | "down" | null;
}

// Generate deterministic floating blob positions
function generateBlobPositions(posterId: string) {
  const seed = posterId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const blobs = [];
  const blobCount = 7;
  
  for (let i = 0; i < blobCount; i++) {
    const hash = (seed * (i + 1) * 31) % 1000;
    blobs.push({
      size: 150 + (hash % 250),
      x: (hash % 100),
      y: ((hash * 7) % 100),
      delay: (i * 3),
      duration: 20 + (hash % 15),
    });
  }
  return blobs;
}

// Sample poster data for dev mode
const DEV_POSTERS: Record<string, Poster> = {
  "scenes-future": {
    id: "scenes-future",
    name: "Scenes From Your Future",
    avatar_gradient: "linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)",
    tagline: "It's already happening",
    accent_color: "#8E2DE2",
  },
  "from-you": {
    id: "from-you",
    name: "From You",
    avatar_gradient: "linear-gradient(135deg, #c94b4b 0%, #4b134f 100%)",
    tagline: "A letter from yourself",
    accent_color: "#C94B4B",
  },
  "window-opener": {
    id: "window-opener",
    name: "Window Opener",
    avatar_gradient: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
    tagline: "What if?",
    accent_color: "#2C5364",
  },
  "sage": {
    id: "sage",
    name: "The Sage",
    avatar_gradient: "linear-gradient(135deg, #434343 0%, #000000 100%)",
    tagline: "Timeless perspective",
    accent_color: "#5C5C5C",
  },
  "evergreen": {
    id: "evergreen",
    name: "Evergreen",
    avatar_gradient: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)",
    tagline: "Roots and wonder",
    accent_color: "#71B280",
  },
};

export default function PosterProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [poster, setPoster] = useState<Poster | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPoster = async () => {
      if (isDevModeEnabled()) {
        const devPoster = DEV_POSTERS[resolvedParams.id];
        if (devPoster) {
          setPoster(devPoster);
          // Get posts from this poster
          const posterPosts = TEST_POSTS
            .filter(p => p.poster_id === resolvedParams.id)
            .map(p => ({
              id: p.id,
              content: p.content,
              post_type: p.post_type,
              created_at: p.created_at,
              feedback: p.feedback as "up" | "down" | null,
            }));
          setPosts(posterPosts);
        }
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch poster info
      const { data: posterData } = await supabase
        .from("posters")
        .select("*")
        .eq("id", resolvedParams.id)
        .single();

      if (posterData) {
        const accentColor = POSTER_COLORS[posterData.id] || "#FCC800";
        setPoster({
          ...posterData,
          accent_color: accentColor,
        });

        // Fetch posts from this poster for this user
        const { data: postsData } = await supabase
          .from("posts")
          .select("id, content, post_type, created_at, feedback")
          .eq("poster_id", resolvedParams.id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (postsData) {
          setPosts(postsData as Post[]);
        }
      }

      setLoading(false);
    };

    loadPoster();
  }, [resolvedParams.id, router]);

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
        <SpinningPill />
      </main>
    );
  }

  if (!poster) {
    return (
      <main className="min-h-screen bg-black">
        <Header showProfile={false} />
        <div className="max-w-xl mx-auto px-4 py-12 text-center">
          <p className="text-[var(--foreground-muted)]">Poster not found</p>
          <button
            onClick={() => router.push("/feed")}
            className="btn-secondary mt-4"
          >
            Back to Feed
          </button>
        </div>
      </main>
    );
  }

  const accentColor = poster.accent_color || POSTER_COLORS[poster.id] || "#FCC800";
  const blobs = generateBlobPositions(poster.id);

  return (
    <main className="min-h-screen bg-black">
      <Header showProfile={false} />

      {/* Back button */}
      <div className="max-w-xl mx-auto px-4 pt-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[var(--foreground-muted)] hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {/* Profile header */}
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="relative overflow-hidden rounded-3xl">
          {/* Floating orb blobs in background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {blobs.map((blob, i) => (
              <div
                key={i}
                className="absolute rounded-full blur-3xl opacity-30 animate-blob"
                style={{
                  width: blob.size,
                  height: blob.size,
                  left: `${blob.x}%`,
                  top: `${blob.y}%`,
                  background: accentColor,
                  animationDelay: `${blob.delay}s`,
                  animationDuration: `${blob.duration}s`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}
          </div>
          
          {/* Semi-transparent overlay */}
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xl pointer-events-none" />
          
          {/* Content */}
          <div className="relative z-10 p-8 flex flex-col items-center text-center">
            {/* Large orb avatar */}
            <div className="relative w-28 h-28 rounded-full overflow-hidden mb-6">
              {/* Northern lights ambient glow */}
              <div 
                className="absolute inset-0 animate-aurora"
                style={{ 
                  background: `radial-gradient(ellipse at 30% 20%, ${accentColor}50, transparent 50%),
                              radial-gradient(ellipse at 70% 80%, ${accentColor}40, transparent 50%),
                              radial-gradient(ellipse at 50% 50%, ${accentColor}30, transparent 60%)`,
                }}
              />
              {/* Orb inner glow */}
              <div 
                className="absolute inset-[4px] rounded-full"
                style={{ 
                  background: `radial-gradient(circle at 30% 30%, ${accentColor}70, ${accentColor}40 40%, ${accentColor}15 70%, transparent)`,
                  boxShadow: `0 0 50px ${accentColor}50, inset 0 0 30px ${accentColor}30`,
                }}
              />
              {/* Glass overlay */}
              <div className="absolute inset-[4px] rounded-full bg-gradient-to-br from-white/15 to-transparent" />
            </div>

            {/* Name and badge */}
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-white">{poster.name}</h1>
              <span 
                className="inline-flex items-center justify-center w-6 h-6 rounded-full"
                style={{ background: accentColor }}
              >
                <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </span>
            </div>

            {/* Tagline */}
            <p className="text-[var(--foreground-muted)] text-lg mb-4">
              {poster.tagline}
            </p>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-white font-semibold text-xl">{posts.length}</p>
                <p className="text-[var(--foreground-subtle)]">posts</p>
              </div>
              <div className="w-px h-8 bg-[#333]" />
              <div className="text-center">
                <p className="text-white font-semibold text-xl">
                  {posts.filter(p => p.feedback === "up").length}
                </p>
                <p className="text-[var(--foreground-subtle)]">upvoted</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts from this poster */}
      <div className="max-w-xl mx-auto px-4 pb-20">
        <h2 className="text-lg font-medium text-white mb-4">Recent Posts</h2>
        
        {posts.length === 0 ? (
          <p className="text-[var(--foreground-muted)] text-center py-8">
            No posts yet from this poster
          </p>
        ) : (
          <div className="divide-y divide-[#222]">
            {posts.map((post) => (
              <button
                key={post.id}
                onClick={() => router.push(`/post/${post.id}`)}
                className="w-full text-left py-4 hover:bg-white/5 transition-colors"
              >
                <p className="text-[var(--foreground)] leading-relaxed line-clamp-3">
                  {post.content}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[var(--foreground-subtle)] text-sm">
                    {formatTimeAgo(post.created_at)}
                  </span>
                  {post.feedback === "up" && (
                    <span className="text-green-400 text-sm flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 15l7-7 7 7" />
                      </svg>
                      Upvoted
                    </span>
                  )}
                  {post.feedback === "down" && (
                    <span className="text-red-400 text-sm flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                      </svg>
                      Downvoted
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

