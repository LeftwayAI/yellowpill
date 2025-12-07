"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isDevModeEnabled, TEST_MANIFEST, TEST_POSTS, POSTER_COLORS } from "@/lib/dev-auth";
import { Header } from "@/components/Header";
import { SpinningPill } from "@/components/SpinningPill";
import { LinkPreview, extractUrls, removeUrlsFromText } from "@/components/LinkPreview";

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
  // For inline replies
  replies?: { role: "user" | "assistant"; content: string }[];
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
    // Find current post to check if we're toggling off
    const currentPost = posts.find(p => p.id === postId);
    const newFeedback = currentPost?.feedback === feedback ? null : feedback;
    
    if (isDevModeEnabled()) {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, feedback: newFeedback } : p))
      );
      return;
    }

    const supabase = createClient();
    await supabase.from("posts").update({ feedback: newFeedback }).eq("id", postId);

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, feedback: newFeedback } : p))
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

  const handleReply = useCallback(async (postId: string, message: string): Promise<string | null> => {
    if (isDevModeEnabled()) {
      // Simulate response in dev mode
      await new Promise(resolve => setTimeout(resolve, 1000));
      return "That's interesting! I'll keep that in mind.|||Noted your thoughts";
    }

    try {
      const response = await fetch("/api/posts/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, message }),
      });

      if (!response.ok) {
        console.error("Reply failed:", await response.text());
        return null;
      }

      const data = await response.json();
      // Return response and manifest update combined
      if (data.manifestUpdate) {
        return `${data.response}|||${data.manifestUpdate}`;
      }
      return data.response;
    } catch (err) {
      console.error("Reply error:", err);
      return null;
    }
  }, []);

  const handleDelete = useCallback(async (postId: string) => {
    if (isDevModeEnabled()) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    
    if (!error) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
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
        <div className="flex gap-3 px-4 py-4 border-b border-[#222]">
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
                onReply={handleReply}
                onDelete={handleDelete}
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
  onReply: (postId: string, message: string) => Promise<string | null>;
  onDelete: (id: string) => void;
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

// Oracle Orb Avatar - each has unique random movement
interface OracleOrbProps {
  posterId: string;
  accentColor: string;
  onClick: (e: React.MouseEvent) => void;
}

function OracleOrb({ posterId, accentColor, onClick }: OracleOrbProps) {
  // Generate unique animation values based on posterId
  const seed = posterId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const duration1 = 8 + (seed % 7); // 8-15s
  const duration2 = 10 + ((seed * 3) % 8); // 10-18s
  const duration3 = 12 + ((seed * 7) % 6); // 12-18s
  const delay1 = (seed % 5) * 0.5; // 0-2.5s
  const delay2 = ((seed * 2) % 5) * 0.5;
  const delay3 = ((seed * 3) % 5) * 0.5;
  
  // Random starting positions for the inner glow orbs
  const pos1 = { x: 20 + (seed % 30), y: 20 + ((seed * 2) % 30) };
  const pos2 = { x: 50 + ((seed * 3) % 30), y: 60 + ((seed * 4) % 25) };
  const pos3 = { x: 70 + ((seed * 5) % 20), y: 30 + ((seed * 6) % 30) };

  return (
    <button
      onClick={onClick}
      className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
      style={{ 
        // Solid color base - the "surface" of the orb
        background: accentColor,
      }}
    >
      {/* Inner glow orbs - swirling underneath the surface */}
      <div 
        className="absolute rounded-full blur-[3px]"
        style={{
          width: '150%',
          height: '150%',
          left: `${pos1.x - 40}%`,
          top: `${pos1.y - 40}%`,
          background: `radial-gradient(circle, white 0%, ${accentColor} 30%, transparent 60%)`,
          animation: `orb-swirl-1-${posterId} ${duration1}s ease-in-out infinite`,
          animationDelay: `${delay1}s`,
          opacity: 0.6,
        }}
      />
      <div 
        className="absolute rounded-full blur-[4px]"
        style={{
          width: '120%',
          height: '120%',
          left: `${pos2.x - 40}%`,
          top: `${pos2.y - 40}%`,
          background: `radial-gradient(circle, ${accentColor}ff 0%, ${accentColor}88 40%, transparent 70%)`,
          animation: `orb-swirl-2-${posterId} ${duration2}s ease-in-out infinite`,
          animationDelay: `${delay2}s`,
          opacity: 0.7,
        }}
      />
      <div 
        className="absolute rounded-full blur-[2px]"
        style={{
          width: '100%',
          height: '100%',
          left: `${pos3.x - 50}%`,
          top: `${pos3.y - 50}%`,
          background: `radial-gradient(circle, rgba(0,0,0,0.4) 0%, transparent 50%)`,
          animation: `orb-swirl-3-${posterId} ${duration3}s ease-in-out infinite`,
          animationDelay: `${delay3}s`,
          opacity: 0.5,
        }}
      />
      
      {/* Glass surface reflection - sharp circular edge */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 70% 80%, rgba(0,0,0,0.3) 0%, transparent 40%)
          `,
        }}
      />
      
      {/* Sharp circular border for definition */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.15), inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.2)`,
        }}
      />

      {/* Unique keyframes for this orb */}
      <style>{`
        @keyframes orb-swirl-1-${posterId} {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(${10 + (seed % 15)}%, ${-10 - (seed % 10)}%) scale(1.1); }
          50% { transform: translate(${-5 - (seed % 10)}%, ${5 + (seed % 15)}%) scale(0.95); }
          75% { transform: translate(${8 + (seed % 12)}%, ${8 + (seed % 8)}%) scale(1.05); }
        }
        @keyframes orb-swirl-2-${posterId} {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(${-12 - ((seed * 2) % 10)}%, ${6 + ((seed * 2) % 12)}%) scale(1.08); }
          66% { transform: translate(${8 + ((seed * 2) % 8)}%, ${-8 - ((seed * 2) % 10)}%) scale(0.92); }
        }
        @keyframes orb-swirl-3-${posterId} {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(${15 + ((seed * 3) % 10)}%, ${-10 - ((seed * 3) % 15)}%); }
        }
      `}</style>
    </button>
  );
}

function PostCard({ post, onFeedback, onSeen, onReply, onDelete, formatTimeAgo }: PostCardProps) {
  const router = useRouter();
  const [hasSeen, setHasSeen] = useState(post.seen);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [replies, setReplies] = useState<{ role: "user" | "assistant"; content: string }[]>(post.replies || []);
  const [manifestUpdate, setManifestUpdate] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Get accent color for this poster
  const accentColor = post.poster.accent_color || POSTER_COLORS[post.poster_id] || "#FCC800";

  // Focus input when reply opens
  useEffect(() => {
    if (showReply && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [showReply]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleReplySubmit = async () => {
    if (!replyText.trim() || isReplying) return;
    
    setIsReplying(true);
    const userMessage = replyText.trim();
    setReplyText("");
    
    // Add user message to thread immediately
    setReplies(prev => [...prev, { role: "user", content: userMessage }]);
    
    // Send to API
    const response = await onReply(post.id, userMessage);
    
    if (response) {
      // Parse response - format is "RESPONSE|||MANIFEST_UPDATE" or just response
      const parts = response.split("|||");
      const assistantResponse = parts[0];
      const update = parts[1] || null;
      
      setReplies(prev => [...prev, { role: "assistant", content: assistantResponse }]);
      
      if (update) {
        setManifestUpdate(update);
        // Clear after 4 seconds
        setTimeout(() => setManifestUpdate(null), 4000);
      }
    }
    
    setIsReplying(false);
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleReplySubmit();
    }
  };
  
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
      className="relative cursor-pointer overflow-hidden group border-b border-[#222]"
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
        {/* Gutter - Oracle orb avatar */}
        <OracleOrb 
          posterId={post.poster_id}
          accentColor={accentColor}
          onClick={handlePosterClick}
        />
        
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
            {/* Verified badge - smaller */}
            <span 
              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full -mt-0.5"
              style={{ background: accentColor }}
            >
              <svg className="w-2 h-2 text-black" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </span>
            <span className="text-[var(--foreground-subtle)] text-[15px]">
              · {formatTimeAgo(post.created_at)}
            </span>
            {/* Spacer to push menu to right */}
            <div className="flex-1" />
            {/* More menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1 rounded-full text-[var(--foreground-subtle)] hover:text-[var(--foreground-muted)] hover:bg-[#222] transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl overflow-hidden z-50 min-w-[120px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete(post.id);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-[#222] transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <p className="text-[var(--foreground)] leading-relaxed text-[15px] whitespace-pre-wrap">
            {removeUrlsFromText(post.content)}
          </p>

          {/* Link Previews */}
          {extractUrls(post.content).map((url, idx) => (
            <LinkPreview key={idx} url={url} accentColor={accentColor} />
          ))}

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
          <div className="flex items-center gap-1 mt-2 -ml-2">
            {/* Reply button - first */}
            <ActionButton
              active={showReply}
              activeColor="text-[#FCC800]"
              onClick={(e) => {
                e.stopPropagation();
                setShowReply(!showReply);
              }}
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
            </ActionButton>
            {/* Thumbs up */}
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
            {/* Thumbs down */}
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
          </div>

          {/* Manifest update toast */}
          {manifestUpdate && (
            <div 
              className="mt-3 px-3 py-2 rounded-lg text-sm animate-fade-in"
              style={{ background: `${accentColor}15`, borderLeft: `2px solid ${accentColor}` }}
            >
              <span className="text-[var(--foreground-muted)] italic">Got it. Updating my memory of you.</span>
            </div>
          )}

          {/* Reply thread */}
          {(showReply || replies.length > 0) && (
            <div className="mt-3 border-t border-[#222] pt-3" onClick={(e) => e.stopPropagation()}>
              {/* Existing replies */}
              {replies.map((reply, idx) => (
                <div 
                  key={idx} 
                  className={`mb-3 ${reply.role === "user" ? "pl-4 border-l-2 border-[#333]" : ""}`}
                >
                  <span className="text-xs text-[var(--foreground-subtle)] mb-1 block">
                    {reply.role === "user" ? "You" : post.poster.name}
                  </span>
                  <p className="text-[var(--foreground)] text-sm leading-relaxed">
                    {reply.content}
                  </p>
                </div>
              ))}
              
              {/* Reply input */}
              {showReply && (
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={replyInputRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={handleReplyKeyDown}
                    placeholder="Reply..."
                    rows={1}
                    disabled={isReplying}
                    className="flex-1 resize-none text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none disabled:opacity-50"
                    style={{ 
                      background: 'transparent', 
                      border: 'none', 
                      boxShadow: 'none',
                      padding: '8px 0',
                      borderRadius: 0,
                      borderBottom: '1px solid #333',
                    }}
                  />
                  <button
                    onClick={handleReplySubmit}
                    disabled={!replyText.trim() || isReplying}
                    className="px-3 py-1.5 rounded-full text-sm font-medium transition-all disabled:opacity-30"
                    style={{ 
                      background: replyText.trim() ? accentColor : '#333',
                      color: replyText.trim() ? '#000' : '#666',
                    }}
                  >
                    {isReplying ? "..." : "Send"}
                  </button>
                </div>
              )}
            </div>
          )}
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
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
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
