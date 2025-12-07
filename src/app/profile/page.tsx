"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isDevModeEnabled, TEST_MANIFEST } from "@/lib/dev-auth";
import { Header } from "@/components/Header";
import { SpinningPill } from "@/components/SpinningPill";

// Yellow Pill Tiers
const PILL_TIERS = [
  { name: "Curious", minPills: 0, color: "#666666" },
  { name: "Awakening", minPills: 10, color: "#8B7355" },
  { name: "Aware", minPills: 50, color: "#C9A227" },
  { name: "Enlightened", minPills: 100, color: "#FCC800" },
  { name: "Illuminated", minPills: 250, color: "#FFD700" },
  { name: "Transcendent", minPills: 500, color: "#FF8C00" },
  { name: "Ascended", minPills: 1000, color: "#FF4500" },
  { name: "Cosmic", minPills: 2500, color: "#9932CC" },
  { name: "Infinite", minPills: 5000, color: "#00CED1" },
  { name: "Yellow Pill God", minPills: 10000, color: "#FFD700" },
];

function getTier(pillCount: number) {
  let tier = PILL_TIERS[0];
  for (const t of PILL_TIERS) {
    if (pillCount >= t.minPills) {
      tier = t;
    }
  }
  return tier;
}

function getNextTier(pillCount: number) {
  for (const t of PILL_TIERS) {
    if (pillCount < t.minPills) {
      return t;
    }
  }
  return null; // Already at max
}

interface ProfileStats {
  joinedAt: string;
  pillsTaken: number;
  postsGenerated: number;
  upvotes: number;
  downvotes: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userProfileImage, setUserProfileImage] = useState("");
  const [stats, setStats] = useState<ProfileStats>({
    joinedAt: new Date().toISOString(),
    pillsTaken: 0,
    postsGenerated: 0,
    upvotes: 0,
    downvotes: 0,
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (isDevModeEnabled()) {
        setUserName(TEST_MANIFEST.identity?.name || "Test User");
        setUserEmail("test@yellowpill.dev");
        setStats({
          joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
          pillsTaken: 47,
          postsGenerated: 156,
          upvotes: 23,
          downvotes: 5,
        });
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Get profile image and name from X auth
      const profileImage = user.user_metadata?.avatar_url || user.user_metadata?.picture;
      if (profileImage) {
        setUserProfileImage(profileImage);
      }
      setUserEmail(user.email || "");

      // Get name from manifest
      const { data: manifestData } = await supabase
        .from("soul_manifests")
        .select("manifest, created_at")
        .eq("user_id", user.id)
        .single();

      if (manifestData) {
        const manifest = manifestData.manifest as { identity?: { name?: string } };
        setUserName(manifest?.identity?.name || user.email?.split("@")[0] || "");
      }

      // Get stats
      const { data: posts } = await supabase
        .from("posts")
        .select("seen, feedback")
        .eq("user_id", user.id);

      const pillsTaken = posts?.filter(p => p.seen).length || 0;
      const upvotes = posts?.filter(p => p.feedback === "up").length || 0;
      const downvotes = posts?.filter(p => p.feedback === "down").length || 0;

      setStats({
        joinedAt: user.created_at || manifestData?.created_at || new Date().toISOString(),
        pillsTaken,
        postsGenerated: posts?.length || 0,
        upvotes,
        downvotes,
      });

      setLoading(false);
    };

    loadProfile();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black">
        <SpinningPill />
      </main>
    );
  }

  const currentTier = getTier(stats.pillsTaken);
  const nextTier = getNextTier(stats.pillsTaken);
  const progressToNext = nextTier 
    ? ((stats.pillsTaken - currentTier.minPills) / (nextTier.minPills - currentTier.minPills)) * 100
    : 100;

  const joinDate = new Date(stats.joinedAt);
  const formattedJoinDate = joinDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-black">
      <Header userName={userName} userProfileImage={userProfileImage} />

      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="text-center mb-10">
          {/* Avatar */}
          <div className="w-24 h-24 mx-auto rounded-full overflow-hidden mb-5 border border-[var(--border)]">
            {userProfileImage ? (
              <img
                src={userProfileImage}
                alt={userName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center text-3xl font-bold bg-[var(--background-elevated)]"
                style={{ color: currentTier.color }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          {/* Name */}
          <h1 className="text-2xl font-semibold text-white mb-1">{userName}</h1>
          <p className="text-[var(--foreground-muted)] text-sm">{userEmail}</p>
          
          {/* Join date */}
          <p className="text-sm mt-3">
            <span className="text-[var(--yellow-primary)]">Yellow Pilled Since</span>
            <span className="text-[var(--foreground-muted)]"> {formattedJoinDate}</span>
          </p>
        </div>

        {/* Tier Card */}
        <div className="rounded-xl p-6 mb-6 bg-[var(--background-elevated)] border border-[var(--border)]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[var(--foreground-subtle)] text-xs uppercase tracking-wide mb-1">
                Current Tier
              </p>
              <h2 
                className="text-xl font-semibold"
                style={{ color: currentTier.color }}
              >
                {currentTier.name}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[var(--foreground-subtle)] text-xs uppercase tracking-wide mb-1">
                Yellow Pills
              </p>
              <p 
                className="text-2xl font-semibold"
                style={{ color: currentTier.color }}
              >
                {stats.pillsTaken}
              </p>
            </div>
          </div>

          {/* Progress to next tier */}
          {nextTier && (
            <div>
              <div className="flex justify-between text-xs text-[var(--foreground-muted)] mb-2">
                <span>Progress to {nextTier.name}</span>
                <span>{nextTier.minPills - stats.pillsTaken} pills to go</span>
              </div>
              <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500 bg-[var(--yellow-primary)]"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
            </div>
          )}

          {!nextTier && (
            <p className="text-sm text-center text-[var(--yellow-primary)]">
              You have achieved ultimate enlightenment
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="text-center p-4 rounded-xl bg-[var(--background-elevated)] border border-[var(--border)]">
            <p className="text-xl font-semibold text-white">{stats.postsGenerated}</p>
            <p className="text-[var(--foreground-muted)] text-xs mt-1">Posts Received</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-[var(--background-elevated)] border border-[var(--border)]">
            <p className="text-xl font-semibold text-white">{stats.upvotes}</p>
            <p className="text-[var(--foreground-muted)] text-xs mt-1">Upvotes</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-[var(--background-elevated)] border border-[var(--border)]">
            <p className="text-xl font-semibold text-white">{stats.downvotes}</p>
            <p className="text-[var(--foreground-muted)] text-xs mt-1">Downvotes</p>
          </div>
        </div>

        {/* Back to Feed */}
        <button
          onClick={() => router.push("/feed")}
          className="btn-secondary w-full"
        >
          Back to Feed
        </button>
      </div>
    </main>
  );
}

