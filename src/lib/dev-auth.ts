// Development authentication bypass
// Only active when NODE_ENV === 'development' AND dev mode is enabled

export const TEST_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "test@yellowpill.dev",
};

export const IS_DEV = process.env.NODE_ENV === "development";

// Poster accent colors (hex codes)
// Active posters at top, archived posters below
export const POSTER_COLORS: Record<string, string> = {
  // === ACTIVE ===
  "quick-quote": "#8b7355",         // Warm brown (renamed from daily-dose)
  "scenes-future": "#8E2DE2",       // Vivid purple
  
  // === ARCHIVED (kept for backward compat) ===
  "daily-dose": "#8b7355",          // Alias for quick-quote
  "from-you": "#C94B4B",            // Warm red
  "window-opener": "#2C5364",       // Deep teal
  "sage": "#5C5C5C",                // Charcoal
  "evergreen": "#71B280",           // Forest green
  "mirror": "#A8EDEA",              // Soft mint
  "archivist": "#C9A227",           // Golden brown
  "muse": "#F5576C",                // Coral pink
  "project-pulse": "#3B82F6",       // Electric blue
  "deepener": "#A855F7",            // Soft purple
  "hype-man": "#F59E0B",            // Gold/amber
  "uncomfortable-truth": "#DC2626", // Deep red
  "kindred-spirits": "#302b63",     // Midnight purple
  "on-this-day": "#d76d77",         // Dusty rose
  "visual-dreams": "#ff6b6b",       // Coral
};

// Check if dev mode is enabled (client-side only)
export function isDevModeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return IS_DEV && localStorage.getItem("yellowpill_dev_mode") === "true";
}

// Get the effective user (test user in dev mode, or null)
export function getDevUser() {
  if (isDevModeEnabled()) {
    return {
      id: TEST_USER.id,
      email: TEST_USER.email,
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };
  }
  return null;
}

// Sample manifest for testing
export const TEST_MANIFEST = {
  id: "test-manifest-001",
  user_id: TEST_USER.id,
  schema_version: "1.0",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  identity: {
    name: "Test User",
    passions: [
      {
        id: "p1",
        value: "Building products that matter",
        weight: 0.8,
        source: "onboarding",
        created_at: new Date().toISOString(),
      },
      {
        id: "p2",
        value: "Understanding how things work",
        weight: 0.7,
        source: "onboarding",
        created_at: new Date().toISOString(),
      },
    ],
    superpowers: [
      {
        id: "s1",
        value: "Connecting disparate ideas",
        weight: 0.8,
        source: "onboarding",
        created_at: new Date().toISOString(),
      },
    ],
    values: [
      {
        id: "v1",
        value: "Authenticity",
        weight: 0.9,
        source: "onboarding",
        created_at: new Date().toISOString(),
      },
      {
        id: "v2",
        value: "Growth",
        weight: 0.8,
        source: "onboarding",
        created_at: new Date().toISOString(),
      },
    ],
    purpose: [],
  },
  life_context: {
    current_location: {
      city: "San Francisco",
      country: "USA",
      neighborhood: "SOMA",
    },
    eras: [
      {
        id: "e1",
        name: "The Building Years",
        time_period: "2020 - present",
        location: "San Francisco",
        description: "Focused on building and creating",
        weight: 0.8,
      },
    ],
    life_story_summary: {
      id: "ls1",
      value:
        "A builder at heart, always curious, always creating. Moved west to chase bigger dreams.",
      weight: 0.7,
      source: "onboarding",
      created_at: new Date().toISOString(),
    },
  },
  relationships: {
    family: [],
    important_people: [],
  },
  growth: {
    current_challenges: [
      {
        id: "c1",
        value: "Balancing ambition with presence",
        weight: 0.7,
        source: "onboarding",
        created_at: new Date().toISOString(),
      },
    ],
    fears: [
      {
        id: "f1",
        value: "Not living up to potential",
        weight: 0.6,
        source: "onboarding",
        created_at: new Date().toISOString(),
      },
    ],
    goals_short_term: [],
    goals_long_term: [],
  },
  dreams: {
    vivid_future_scenes: [
      {
        id: "d1",
        value:
          "Standing on stage, sharing ideas that changed how people think about AI and humanity",
        weight: 0.8,
        source: "onboarding",
        created_at: new Date().toISOString(),
      },
      {
        id: "d2",
        value:
          "A quiet morning in a house overlooking the ocean, writing the book that's been brewing for years",
        weight: 0.7,
        source: "onboarding",
        created_at: new Date().toISOString(),
      },
    ],
    fantasy_selves: [
      {
        id: "fs1",
        value: "Founder",
        weight: 0.7,
        source: "onboarding",
        created_at: new Date().toISOString(),
      },
      {
        id: "fs2",
        value: "Author",
        weight: 0.6,
        source: "onboarding",
        created_at: new Date().toISOString(),
      },
    ],
  },
  worldview: {},
};

// Sample posts for testing - now with accent colors
export const TEST_POSTS = [
  {
    id: "post-001",
    user_id: TEST_USER.id,
    poster_id: "scenes-future",
    post_type: "future_scene",
    content:
      "It's autumn, 2028. You're backstage, about to walk out to a packed theater. Your book just hit #1. The nerves are there, but underneath them—certainty. You built this.",
    manifest_fields_used: ["dreams.vivid_future_scenes"],
    seen: false,
    seen_at: null,
    feedback: null,
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    poster: {
      id: "scenes-future",
      name: "Scenes From Your Future",
      avatar_gradient: "linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)",
      tagline: "It's already happening",
      accent_color: "#8E2DE2",
    },
  },
  {
    id: "post-002",
    user_id: TEST_USER.id,
    poster_id: "from-you",
    post_type: "reminder",
    content:
      "You don't need permission to want what you want. You already know. Trust it.",
    manifest_fields_used: ["identity.values", "growth.fears"],
    seen: false,
    seen_at: null,
    feedback: null,
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    poster: {
      id: "from-you",
      name: "From You",
      avatar_gradient: "linear-gradient(135deg, #c94b4b 0%, #4b134f 100%)",
      tagline: "A letter from yourself",
      accent_color: "#C94B4B",
    },
  },
  {
    id: "post-003",
    user_id: TEST_USER.id,
    poster_id: "window-opener",
    post_type: "what_if",
    content:
      "What if the thing you're avoiding is exactly where the growth is?",
    manifest_fields_used: ["growth.current_challenges"],
    seen: true,
    seen_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    feedback: "up",
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    poster: {
      id: "window-opener",
      name: "Window Opener",
      avatar_gradient:
        "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
      tagline: "What if?",
      accent_color: "#2C5364",
    },
  },
  {
    id: "post-004",
    user_id: TEST_USER.id,
    poster_id: "sage",
    post_type: "reframe",
    content:
      "The obstacle isn't blocking your path. It is the path. Everything you're building is built on the hard parts.",
    manifest_fields_used: ["growth.current_challenges", "identity.values"],
    seen: true,
    seen_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    feedback: null,
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    poster: {
      id: "sage",
      name: "The Sage",
      avatar_gradient: "linear-gradient(135deg, #434343 0%, #000000 100%)",
      tagline: "Timeless perspective",
      accent_color: "#5C5C5C",
    },
  },
  {
    id: "post-005",
    user_id: TEST_USER.id,
    poster_id: "evergreen",
    post_type: "local_gem",
    content:
      "SOMA was where the printing presses once thundered. Now it's where the future gets built. You're part of that lineage.",
    manifest_fields_used: ["life_context.current_location"],
    seen: true,
    seen_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    feedback: "up",
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    poster: {
      id: "evergreen",
      name: "Evergreen",
      avatar_gradient: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)",
      tagline: "Roots and wonder",
      accent_color: "#71B280",
    },
  },
];
