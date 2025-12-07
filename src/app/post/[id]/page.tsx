"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isDevModeEnabled, TEST_POSTS, POSTER_COLORS } from "@/lib/dev-auth";
import { Header } from "@/components/Header";
import { SpinningPill } from "@/components/SpinningPill";

interface PosterInfo {
  id: string;
  name: string;
  avatar_gradient: string;
  tagline: string;
  accent_color?: string;
}

interface Post {
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

// Generate deterministic floating blob positions based on post ID
function generateBlobPositions(postId: string) {
  const seed = postId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const blobs = [];
  const blobCount = 5 + (seed % 3); // 5-7 blobs for detail page
  
  for (let i = 0; i < blobCount; i++) {
    const hash = (seed * (i + 1) * 31) % 1000;
    blobs.push({
      size: 100 + (hash % 200), // larger blobs for detail page
      x: (hash % 100),
      y: ((hash * 7) % 100),
      delay: (i * 2),
      duration: 15 + (hash % 10),
    });
  }
  return blobs;
}

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [replies, setReplies] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const loadPost = async () => {
      if (isDevModeEnabled()) {
        const testPost = TEST_POSTS.find(p => p.id === resolvedParams.id);
        if (testPost) {
          setPost(testPost as Post);
          setFeedback(testPost.feedback as "up" | "down" | null);
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

      // Fetch post with poster info
      const { data: postData } = await supabase
        .from("posts")
        .select(`
          *,
          poster:posters(id, name, avatar_gradient, tagline)
        `)
        .eq("id", resolvedParams.id)
        .single();

      if (postData) {
        const accentColor = POSTER_COLORS[postData.poster_id] || "#FCC800";
        setPost({
          ...postData,
          poster: {
            ...postData.poster,
            accent_color: accentColor,
          }
        } as Post);
        setFeedback(postData.feedback as "up" | "down" | null);
      }

      setLoading(false);
    };

    loadPost();
  }, [resolvedParams.id, router]);

  const handleFeedback = async (newFeedback: "up" | "down") => {
    if (!post) return;
    
    setFeedback(newFeedback);
    
    if (!isDevModeEnabled()) {
      const supabase = createClient();
      await supabase
        .from("posts")
        .update({ feedback: newFeedback })
        .eq("id", post.id);
    }
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !post || isReplying) return;
    
    setIsReplying(true);
    const userMessage = replyText.trim();
    setReplyText("");
    
    // Add user message to thread immediately
    setReplies(prev => [...prev, { role: "user", content: userMessage }]);
    
    if (isDevModeEnabled()) {
      // Simulate response in dev mode
      await new Promise(resolve => setTimeout(resolve, 1000));
      setReplies(prev => [...prev, { role: "assistant", content: "That's interesting! I'll keep that in mind." }]);
      setIsReplying(false);
      return;
    }

    try {
      const response = await fetch("/api/posts/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, message: userMessage }),
      });

      if (response.ok) {
        const data = await response.json();
        setReplies(prev => [...prev, { role: "assistant", content: data.response }]);
      }
    } catch (err) {
      console.error("Reply error:", err);
    }
    
    setIsReplying(false);
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitReply();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black">
        <SpinningPill />
      </main>
    );
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-black">
        <Header showProfile={false} />
        <div className="max-w-xl mx-auto px-4 py-12 text-center">
          <p className="text-[var(--foreground-muted)]">Post not found</p>
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

  const accentColor = post.poster.accent_color || POSTER_COLORS[post.poster_id] || "#FCC800";
  const blobs = generateBlobPositions(post.id);

  return (
    <main className="min-h-screen bg-black relative overflow-hidden">
      {/* Full-page floating orb blobs in background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        {blobs.map((blob, i) => (
          <div
            key={i}
            className="absolute rounded-full blur-3xl opacity-20 animate-blob"
            style={{
              width: blob.size * 2,
              height: blob.size * 2,
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
      
      {/* Semi-transparent overlay for readability */}
      <div className="fixed inset-0 bg-black/70 pointer-events-none" style={{ zIndex: 1 }} />

      {/* Content layer */}
      <div className="relative" style={{ zIndex: 2 }}>
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

        {/* Post detail */}
        <div className="max-w-xl mx-auto px-4 py-6">
          <div className="relative overflow-hidden rounded-2xl">
            {/* Card background */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-none" />
          
          {/* Content */}
          <div className="relative z-10 p-6">
            {/* Poster header */}
            <div className="flex items-center gap-4 mb-6">
              {/* Orb-like avatar with northern lights effect - contained */}
              <button
                onClick={() => router.push(`/poster/${post.poster_id}`)}
                className="relative w-14 h-14 rounded-full overflow-hidden group/avatar flex-shrink-0"
              >
                {/* Base dark background */}
                <div className="absolute inset-0 rounded-full bg-black/80" />
                {/* Northern lights aurora - contained within circle */}
                <div 
                  className="absolute inset-0 rounded-full animate-aurora-drift"
                  style={{ 
                    background: `
                      radial-gradient(ellipse 120% 80% at 20% 20%, ${accentColor}80, transparent 50%),
                      radial-gradient(ellipse 100% 100% at 80% 80%, ${accentColor}60, transparent 45%),
                      radial-gradient(ellipse 80% 120% at 50% 50%, ${accentColor}40, transparent 60%)
                    `,
                  }}
                />
                {/* Second aurora layer with offset animation */}
                <div 
                  className="absolute inset-0 rounded-full animate-aurora-drift-2"
                  style={{ 
                    background: `
                      radial-gradient(ellipse 90% 120% at 70% 30%, ${accentColor}50, transparent 50%),
                      radial-gradient(ellipse 110% 90% at 30% 70%, ${accentColor}40, transparent 45%)
                    `,
                  }}
                />
                {/* Glass overlay */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-transparent to-transparent" />
              </button>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/poster/${post.poster_id}`)}
                    className="font-semibold text-lg text-white hover:underline"
                  >
                    {post.poster.name}
                  </button>
                  <span 
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full -mt-0.5"
                    style={{ background: accentColor }}
                  >
                    <svg className="w-2.5 h-2.5 text-black" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </span>
                </div>
                <p className="text-[var(--foreground-subtle)] text-sm mt-0.5">
                  {post.poster.tagline}
                </p>
              </div>
            </div>

            {/* Content */}
            <p className="text-[var(--foreground)] leading-relaxed text-lg mb-4">
              {post.content}
            </p>

            {/* Timestamp */}
            <p className="text-[var(--foreground-subtle)] text-sm mb-6">
              {formatDate(post.created_at)}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4 border-t border-[#222]">
              <button
                onClick={() => handleFeedback("down")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  feedback === "down" 
                    ? "text-red-400 bg-red-400/10" 
                    : "text-[var(--foreground-muted)] hover:text-red-400 hover:bg-red-400/5"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
                  />
                </svg>
              </button>
              <button
                onClick={() => handleFeedback("up")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  feedback === "up" 
                    ? "text-green-400 bg-green-400/10" 
                    : "text-[var(--foreground-muted)] hover:text-green-400 hover:bg-green-400/5"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Reply section - chat style */}
        <div className="mt-6 pt-4">
          {/* Existing replies */}
          {replies.map((r, idx) => (
            <div 
              key={idx} 
              className={`mb-3 ${r.role === "user" ? "pl-4 border-l-2 border-[#333]" : ""}`}
            >
              <span className="text-xs text-[var(--foreground-subtle)] mb-1 block">
                {r.role === "user" ? "You" : post?.poster.name}
              </span>
              <p className="text-[var(--foreground)] text-sm leading-relaxed">
                {r.content}
              </p>
            </div>
          ))}
          
          {/* Reply input */}
          <div className="flex gap-2 items-end">
            <textarea
              ref={replyInputRef}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleReplyKeyDown}
              placeholder="Write your reply here..."
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
              onClick={handleSubmitReply}
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
        </div>
        </div>
      </div>
    </main>
  );
}

