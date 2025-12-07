"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PostType {
  type: string;
  description: string;
  manifest_fields: string[];
  max_length: number;
}

interface Poster {
  id: string;
  name: string;
  avatar_gradient: string;
  tagline: string;
  system_prompt: string;
  style_guide: string;
  post_types: PostType[];
  manifest_sections: string[];
  is_active: boolean;
}

interface GenerationResult {
  content: string;
  duration_ms: number;
  seed?: string | null;
}

const MOCK_SOUL_SUMMARY = `They are a builder caught between worlds — the stability of established structures and the pull of uncharted territory. In their mid-thirties, they find themselves at a crossroads that feels both urgent and paralyzing. The skills that brought them success feel insufficient for where they want to go.

At their core is a tension between wanting to create something meaningful and the fear that they've waited too long to start. They carry the weight of potential unfulfilled, of ideas that never made it past the planning stage. Their superpower is seeing patterns others miss, connecting dots across disciplines, translating complexity into clarity.

They live in a city that feels temporary — always about to leave, never quite leaving. Their relationships are deep but few, built on a foundation of intellectual connection and shared ambition. They're afraid of mediocrity more than failure, of looking back and wondering what if.

What drives them is the belief that work should matter, that the hours spent should add up to something more than a paycheck. They want to build, to make, to leave a mark. The question that haunts them isn't whether they can, but whether they will.`;

export default function AdminPostersPage() {
  const router = useRouter();
  const [posters, setPosters] = useState<Poster[]>([]);
  const [selectedPoster, setSelectedPoster] = useState<Poster | null>(null);
  const [selectedPostType, setSelectedPostType] = useState<PostType | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPosters, setLoadingPosters] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generations, setGenerations] = useState<GenerationResult[]>([]);
  
  // Editable prompts
  const [systemPrompt, setSystemPrompt] = useState("");
  const [soulSummary, setSoulSummary] = useState(MOCK_SOUL_SUMMARY);
  const [temperature, setTemperature] = useState(0.75);

  // Check if we're in production
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      router.push("/");
      return;
    }
    
    // Fetch posters
    fetchPosters();
  }, [router]);

  const fetchPosters = async () => {
    try {
      const response = await fetch("/api/admin/posters");
      if (!response.ok) throw new Error("Failed to fetch posters");
      const data = await response.json();
      setPosters(data.posters || []);
    } catch (err) {
      setError("Failed to load posters");
      console.error(err);
    } finally {
      setLoadingPosters(false);
    }
  };

  const handlePosterSelect = (poster: Poster) => {
    setSelectedPoster(poster);
    setSelectedPostType(poster.post_types[0] || null);
    setGenerations([]);
    
    // Build initial system prompt
    const fullSystemPrompt = buildSystemPrompt(poster, poster.post_types[0]);
    setSystemPrompt(fullSystemPrompt);
  };

  const buildSystemPrompt = (poster: Poster, postType: PostType | null): string => {
    let prompt = `${poster.system_prompt}

Style Guide:
${poster.style_guide}

APPROACH:
You're writing for someone you deeply understand. The soul context below gives you a sense of who they are — their phase of life, their tensions, their drives.

But here's the key: DON'T reference specific items they mentioned. Instead, let their context inspire an angle that would resonate with ANYONE navigating similar themes.

Think of it like this: You're not writing "Since you're afraid of failure..." You're writing something that happens to speak to fear of failure in a way that feels like a discovery, not a call-out.

The best posts feel like the reader found them organically — not like a robot read their profile.

RULES:
- Never use the reader's name
- Never say "you mentioned" or reference their specific answers
- Write for a general audience — this should feel standalone
- Find an encouraging or reframing angle, not just reflection
- Be specific enough to land, general enough to discover`;

    if (postType) {
      prompt += `

POST TYPE: ${postType.type}
Description: ${postType.description}
Max Length: ${postType.max_length} characters`;
    }

    return prompt;
  };

  const handlePostTypeChange = (type: string) => {
    const postType = selectedPoster?.post_types.find(pt => pt.type === type) || null;
    setSelectedPostType(postType);
    if (selectedPoster) {
      setSystemPrompt(buildSystemPrompt(selectedPoster, postType));
    }
  };

  const handleGenerate = async () => {
    if (!selectedPoster || !selectedPostType) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/generate-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          posterId: selectedPoster.id,
          postType: selectedPostType,
          soulSummary,
          temperature,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Generation failed");
      }

      const result: GenerationResult = await response.json();
      setGenerations(prev => [result, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPrompt = () => {
    if (selectedPoster) {
      setSystemPrompt(buildSystemPrompt(selectedPoster, selectedPostType));
    }
  };

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  if (loadingPosters) {
    return (
      <main className="min-h-screen bg-black p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse text-[var(--foreground-muted)]">Loading posters...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-[#222] bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[var(--foreground-muted)] hover:text-white transition-colors">
              ← Back
            </Link>
            <h1 className="text-xl font-semibold">Poster Testing Lab</h1>
          </div>
          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
            DEV ONLY
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar: Poster list */}
          <div className="col-span-3 space-y-2">
            {/* Active Posters */}
            <h2 className="text-sm font-medium text-[#FCC800] mb-3">
              Active ({posters.filter(p => p.is_active).length})
            </h2>
            {posters
              .filter(p => p.is_active)
              .map(poster => (
              <button
                key={poster.id}
                onClick={() => handlePosterSelect(poster)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedPoster?.id === poster.id
                    ? "bg-[#1a1a1a] border border-[#FCC800]"
                    : "hover:bg-[#111] border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full shrink-0"
                    style={{ background: poster.avatar_gradient }}
                  />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{poster.name}</div>
                    <div className="text-xs text-[var(--foreground-muted)] truncate">
                      {poster.tagline}
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {/* Inactive Posters */}
            <h2 className="text-sm font-medium text-[var(--foreground-subtle)] mt-6 mb-3">
              Archived ({posters.filter(p => !p.is_active).length})
            </h2>
            {posters
              .filter(p => !p.is_active)
              .map(poster => (
              <button
                key={poster.id}
                onClick={() => handlePosterSelect(poster)}
                className={`w-full text-left p-3 rounded-lg transition-all opacity-50 ${
                  selectedPoster?.id === poster.id
                    ? "bg-[#1a1a1a] border border-[#333] opacity-100"
                    : "hover:bg-[#111] border border-transparent hover:opacity-75"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full shrink-0 grayscale"
                    style={{ background: poster.avatar_gradient }}
                  />
                  <div className="min-w-0">
                    <div className="font-medium truncate text-[var(--foreground-muted)]">{poster.name}</div>
                    <div className="text-xs text-[var(--foreground-subtle)] truncate">
                      {poster.tagline}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Main: Configuration */}
          <div className="col-span-5 space-y-6">
            {selectedPoster ? (
              <>
                {/* Post Type selector */}
                <div>
                  <label className="text-sm font-medium text-[var(--foreground-muted)] mb-2 block">
                    Post Type
                  </label>
                  <select
                    value={selectedPostType?.type || ""}
                    onChange={(e) => handlePostTypeChange(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-white"
                  >
                    {selectedPoster.post_types.map(pt => (
                      <option key={pt.type} value={pt.type}>
                        {pt.type} — {pt.description.substring(0, 50)}...
                      </option>
                    ))}
                  </select>
                </div>

                {/* Temperature slider */}
                <div>
                  <label className="text-sm font-medium text-[var(--foreground-muted)] mb-2 block">
                    Temperature: {temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-[var(--foreground-subtle)]">
                    <span>Focused (0)</span>
                    <span>Creative (1)</span>
                  </div>
                </div>

                {/* System Prompt */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-[var(--foreground-muted)]">
                      System Prompt
                    </label>
                    <button
                      onClick={handleResetPrompt}
                      className="text-xs text-[var(--foreground-muted)] hover:text-white"
                    >
                      Reset to default
                    </button>
                  </div>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full h-64 bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-3 text-sm font-mono text-[var(--foreground-muted)] resize-none"
                  />
                </div>

                {/* Soul Summary */}
                <div>
                  <label className="text-sm font-medium text-[var(--foreground-muted)] mb-2 block">
                    Soul Summary (Test Context)
                  </label>
                  <textarea
                    value={soulSummary}
                    onChange={(e) => setSoulSummary(e.target.value)}
                    className="w-full h-40 bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-3 text-sm font-mono text-[var(--foreground-muted)] resize-none"
                  />
                </div>

                {/* Generate button */}
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {loading ? "Generating..." : "Generate Test Post"}
                </button>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-[var(--foreground-muted)]">
                Select a poster to begin testing
              </div>
            )}
          </div>

          {/* Results */}
          <div className="col-span-4 space-y-4">
            <h2 className="text-sm font-medium text-[var(--foreground-muted)]">
              Generated Posts {generations.length > 0 && `(${generations.length})`}
            </h2>
            
            {generations.length === 0 ? (
              <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-6 text-center text-[var(--foreground-subtle)]">
                Generations will appear here
              </div>
            ) : (
              <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                {generations.map((gen, i) => (
                  <div
                    key={i}
                    className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-[var(--foreground-subtle)]">
                        #{generations.length - i}
                      </span>
                      <div className="flex items-center gap-2">
                        {gen.seed && (
                          <span className="text-xs bg-[#FCC800]/20 text-[#FCC800] px-2 py-0.5 rounded">
                            seed: {gen.seed}
                          </span>
                        )}
                        <span className="text-xs text-[var(--foreground-subtle)]">
                          {gen.duration_ms}ms
                        </span>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {gen.content}
                    </p>
                    <div className="mt-3 pt-3 border-t border-[#222] flex items-center gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(gen.content)}
                        className="text-xs text-[var(--foreground-muted)] hover:text-white"
                      >
                        Copy
                      </button>
                      <span className="text-xs text-[var(--foreground-subtle)]">
                        {gen.content.length} chars
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

