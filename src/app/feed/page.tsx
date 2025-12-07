"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isDevModeEnabled, TEST_MANIFEST, TEST_POSTS, POSTER_COLORS } from "@/lib/dev-auth";
import { Header } from "@/components/Header";
import { SpinningPill } from "@/components/SpinningPill";

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
  image_url?: string | null;
  manifest_fields_used: string[] | null;
  seen: boolean;
  seen_at: string | null;
  feedback: "up" | "down" | null;
  pilled: boolean;
  created_at: string;
  poster: PosterInfo;
}

export default function FeedPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [userProfileImage, setUserProfileImage] = useState<string>("");
  const [thought, setThought] = useState("");

  useEffect(() => {
    const loadFeed = async () => {
      // Check for dev mode
      if (isDevModeEnabled()) {
        setUserName(TEST_MANIFEST.identity.name || "");
        // Don't set a profile image in dev mode to use the placeholder
        const testPostsWithPilled = (TEST_POSTS as FeedPost[]).map(p => ({ ...p, pilled: true }));
        setPosts(testPostsWithPilled);
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

      // Get profile image from X/Twitter auth
      const profileImage = user.user_metadata?.avatar_url || user.user_metadata?.picture;
      if (profileImage) {
        setUserProfileImage(profileImage);
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
        console.log("[Feed] Loaded posts:", data.posts?.length, "posts");
        console.log("[Feed] Posts with images:", data.posts?.filter((p: FeedPost) => p.image_url).length);
        const feedPosts = (data.posts || []).map((p: FeedPost) => ({ ...p, pilled: true }));
        
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
                const newPosts = (newData.posts || []).map((p: FeedPost) => ({ ...p, pilled: true }));
                setPosts(newPosts);
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
        <SpinningPill />
      </main>
    );
  }


  return (
    <main className="min-h-screen pb-20 bg-black">
      <Header userName={userName} userProfileImage={userProfileImage} />

      {/* Feed container with vertical rail lines */}
      <div className="max-w-xl mx-auto relative border-x border-[#222]">
        {/* What's on your mind - X style, simple */}
        <div className="flex gap-3 px-4 py-3 border-b border-[#222]">
          {/* Gutter - user avatar */}
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            {userProfileImage ? (
              <img
                src={userProfileImage}
                alt="You"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#222] flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--foreground-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>
          {/* Input area - no border, just text */}
          <div className="flex-1 pt-1">
            <textarea
              value={thought}
              onChange={(e) => setThought(e.target.value)}
              placeholder="What's on your mind?"
              rows={1}
              className="w-full resize-none text-[var(--foreground)] text-xl placeholder:text-[var(--foreground-subtle)] focus:outline-none"
              style={{ 
                background: 'transparent', 
                border: 'none', 
                boxShadow: 'none',
                padding: 0,
                borderRadius: 0,
              }}
            />
          </div>
        </div>

        {/* Feed */}
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <SpinningPill />
            </div>
            <p className="text-[var(--foreground-muted)]">
              Your feed is being generated...
            </p>
          </div>
        ) : (
          <div>
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

// Generate deterministic floating orb positions based on post ID
function generateOrbPositions(postId: string) {
  const seed = postId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const orbs = [];
  const orbCount = 4 + (seed % 3); // 4-6 orbs
  
  for (let i = 0; i < orbCount; i++) {
    const hash = (seed * (i + 1) * 31) % 1000;
    const hash2 = (seed * (i + 1) * 47) % 1000;
    const hash3 = (seed * (i + 1) * 73) % 1000;
    orbs.push({
      size: 180 + (hash % 250), // 180-430px - big floating circles
      startX: -30 + (hash % 140), // -30% to 110% - can start off-screen
      startY: -50 + (hash2 % 150), // -50% to 100% - can be above/below
      // Random movement offsets for each orb - more dramatic
      moveX1: -40 + (hash3 % 80),
      moveY1: -40 + ((hash3 * 3) % 80),
      moveX2: -40 + ((hash * 5) % 80),
      moveY2: -40 + ((hash2 * 7) % 80),
      delay: (i * 2), // stagger animation
      duration: 25 + (hash % 20), // 25-45s - slow organic movement
    });
  }
  return orbs;
}

function PostCard({ post, onFeedback, onSeen, delay, formatTimeAgo }: PostCardProps) {
  const router = useRouter();
  const [hasSeen, setHasSeen] = useState(post.seen);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Get accent color for this poster
  const accentColor = post.poster.accent_color || POSTER_COLORS[post.poster_id] || "#FCC800";
  
  // Generate orb positions - big floating circles
  const orbs = generateOrbPositions(post.id);

  useEffect(() => {
    if (!hasSeen) {
      const timer = setTimeout(() => {
        onSeen(post.id);
        setHasSeen(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasSeen, post.id, onSeen]);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons
    if ((e.target as HTMLElement).closest('button')) return;
    router.push(`/post/${post.id}`);
  };

  const handlePosterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/poster/${post.poster_id}`);
  };

  return (
    <div
      ref={cardRef}
      className="relative animate-slide-up cursor-pointer overflow-hidden group border-b border-[#222]"
      style={{ animationDelay: `${delay}s` }}
      onClick={handleCardClick}
    >
      {/* Large floating orbs - clipped by overflow-hidden on parent */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        {orbs.map((orb, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: orb.size,
              height: orb.size,
              left: `${orb.startX}%`,
              top: `${orb.startY}%`,
              background: `radial-gradient(circle at 35% 35%, ${accentColor}ff 0%, ${accentColor}dd 20%, ${accentColor}99 40%, ${accentColor}44 60%, transparent 75%)`,
              filter: 'blur(2px)',
              opacity: 0.85,
              animation: `orb-float-${post.id}-${i} ${orb.duration}s ease-in-out infinite`,
              animationDelay: `${orb.delay}s`,
            }}
          />
        ))}
        {/* Inject dynamic keyframes for each orb's unique movement */}
        <style>{`
          ${orbs.map((orb, i) => `
            @keyframes orb-float-${post.id}-${i} {
              0%, 100% { transform: translate(0, 0) scale(1); }
              16% { transform: translate(${orb.moveX1}%, ${orb.moveY1 * 0.6}%) scale(1.12); }
              33% { transform: translate(${orb.moveX2 * 0.7}%, ${orb.moveY2}%) scale(0.92); }
              50% { transform: translate(${orb.moveX2}%, ${orb.moveY1}%) scale(1.08); }
              66% { transform: translate(${orb.moveY1 * 0.8}%, ${orb.moveX2 * 0.5}%) scale(0.96); }
              83% { transform: translate(${orb.moveX1 * 0.5}%, ${orb.moveY2 * 0.7}%) scale(1.04); }
            }
          `).join('')}
        `}</style>
      </div>
      
      {/* Dark frosted glass overlay - more opaque, more blur */}
      <div className="absolute inset-0 bg-black/[0.92] backdrop-blur-xl pointer-events-none" style={{ zIndex: 1 }} />
      
      {/* Content - X-style gutter layout */}
      <div className="relative z-10 flex gap-3 px-4 py-3">
        {/* Gutter - Orb-like avatar with lava lamp effect */}
        <button
          onClick={handlePosterClick}
          className="relative w-10 h-10 rounded-full overflow-visible flex-shrink-0 group/avatar"
        >
          {/* Ambient lava glow that moves */}
          <div 
            className="absolute -inset-2 animate-lava-glow rounded-full opacity-60"
            style={{ 
              background: `radial-gradient(ellipse at 30% 30%, ${accentColor}60, transparent 60%),
                          radial-gradient(ellipse at 70% 70%, ${accentColor}40, transparent 50%)`,
              filter: 'blur(8px)',
            }}
          />
          {/* Main orb */}
          <div 
            className="absolute inset-0 rounded-full animate-orb-pulse"
            style={{ 
              background: `radial-gradient(circle at 35% 35%, ${accentColor}90, ${accentColor}60 30%, ${accentColor}30 60%, transparent 80%)`,
              boxShadow: `0 0 20px ${accentColor}50, inset 0 0 10px ${accentColor}30`,
            }}
          />
          {/* Glass highlight */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/15 via-transparent to-transparent" />
        </button>
        
        {/* Main content area - aligned with poster name */}
        <div className="flex-1 min-w-0">
          {/* Poster header line */}
          <div className="flex items-center gap-1 mb-1">
            <button
              onClick={handlePosterClick}
              className="font-medium text-[15px] text-white hover:underline"
            >
              {post.poster.name}
            </button>
            {/* Verified badge */}
            <span 
              className="inline-flex items-center justify-center w-4 h-4 rounded-full"
              style={{ background: accentColor }}
            >
              <svg className="w-2.5 h-2.5 text-black" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </span>
            <span className="text-[var(--foreground-subtle)] text-[15px]">
              · {formatTimeAgo(post.created_at)}
            </span>
          </div>

          {/* Content */}
          <p className="text-[var(--foreground)] leading-relaxed text-[15px]">
            {post.content}
          </p>

          {/* Image if present */}
          {post.image_url && (
            <div className="mt-3 rounded-xl overflow-hidden border border-[#333]">
              <img 
                src={post.image_url} 
                alt="Visual dream" 
                className="w-full h-auto object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Actions - aligned with content */}
          <div className="flex items-center gap-1 mt-3 -ml-2">
            <ActionButton
              active={post.feedback === "down"}
              activeColor="text-red-400"
              onClick={() => onFeedback(post.id, "down")}
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                />
              </svg>
            </ActionButton>
            <ActionButton>
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </ActionButton>
            {/* Reply button */}
            <ActionButton>
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                />
              </svg>
            </ActionButton>
          </div>
        </div>
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
