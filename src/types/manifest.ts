// Soul Manifest Types for Yellow Pill
// Schema version: 1.1

export const CURRENT_SCHEMA_VERSION = "1.1";

// ============================================
// Atomic Units
// ============================================

export interface ManifestItem {
  id: string;
  value: string;
  weight: number; // 0.0 - 1.0
  context_tags?: string[];
  source: "onboarding" | "conversation" | "user_edit";
  created_at: string;
  last_referenced_at?: string;
}

export interface EraItem {
  id: string;
  name: string; // "Early Childhood", "College Years"
  time_period: string; // "1995 - 2001"
  location: string;
  description: string;
  key_events?: string[];
  weight: number;
}

export interface LocationItem {
  city: string;
  neighborhood?: string;
  country: string;
  local_landmarks?: string[];
  years?: string; // "2019 - present"
}

export interface RelationshipItem {
  id: string;
  name?: string;
  relation: string; // "mom", "best friend", "mentor"
  context?: string;
  weight: number;
}

export interface DateItem {
  id: string;
  date: string; // "03-15" (recurring) or "2024-03-15" (specific)
  label: string; // "Mom's birthday"
  type: "celebration" | "remembrance" | "milestone";
  notes?: string;
}

export interface ImageItem {
  id: string;
  url: string;
  type: "profile" | "uploaded";
  created_at: string;
}

// ============================================
// META Observations - AI analysis of raw inputs
// ============================================

export interface MetaObservations {
  // Voice and communication style
  voice_signature: {
    tone: string; // "direct, slightly impatient, optimistic-but-realistic"
    sentence_style: string; // "short declarative sentences, uses 'And' to start sentences"
    vocabulary_level: string; // "conversational but precise"
    notable_patterns: string[]; // ["repeats 'really' for emphasis", "uses lists"]
  };

  // What stands out from their answers
  standout_elements: {
    observation: string;
    why_significant: string;
    source_quote: string;
  }[];

  // Contradictions and tensions worth exploring
  tensions: {
    tension: string; // "Can inspire others but struggles to believe in self"
    poles: [string, string]; // ["external confidence", "internal doubt"]
    source_evidence: string;
  }[];

  // Motivational DNA - what actually drives them
  motivational_drivers: {
    driver: string; // "autonomy", "recognition", "impact", "mastery", "security"
    strength: "primary" | "secondary";
    evidence: string;
  }[];

  // Emotional weight - things that carry more significance
  weighted_themes: {
    theme: string;
    weight: "high" | "medium"; // how much this matters to them
    reasoning: string;
  }[];

  // Phase of life and context
  life_phase_analysis: {
    current_phase: string; // "late 20s builder phase, pre-commitment to major life structures"
    key_decisions_pending: string[];
    time_pressure_felt: boolean;
  };
}

// ============================================
// Interest/Obsession Item
// ============================================

export interface InterestItem {
  id: string;
  topic: string; // "Space exploration"
  fascination_type: "curious_about" | "obsessed_with" | "want_to_learn" | "love_reading_about";
  subtopics?: string[]; // ["Mars colonization", "Starship development"]
  people_who_inspire?: string[]; // ["Elon Musk's engineering approach", "Carl Sagan's communication"]
  weight: number;
  source: "onboarding" | "conversation" | "user_edit";
  created_at: string;
}

// ============================================
// Raw Inputs - preserved verbatim text
// ============================================

export interface RawInputs {
  passions_raw?: string;
  future_raw?: string;
  superpowers_raw?: string;
  challenges_raw?: string;
  fears_raw?: string;
  values_raw?: string;
  life_story_raw?: string;
  interests_raw?: string;
  [key: string]: string | undefined; // Allow dynamic keys for future questions
}

// ============================================
// Voice Profile - global tones for generation
// ============================================

export interface VoiceProfile {
  // How to speak TO this person
  preferred_directness: "very_direct" | "direct" | "gentle" | "very_gentle";
  humor_tolerance: "high" | "medium" | "low";
  challenge_tolerance: "loves_it" | "moderate" | "sensitive";
  
  // What resonates with them
  responds_to: string[]; // ["specificity", "future-casting", "reframes"]
  turned_off_by: string[]; // ["generic advice", "toxic positivity", "preachy tone"]
  
  // Writing style notes for generation
  style_notes: string; // "Appreciates craft in language. Likes when things are clever but not try-hard."
}

// ============================================
// Full Soul Manifest
// ============================================

export interface SoulManifest {
  // === Meta ===
  id: string;
  user_id: string;
  schema_version: string;
  created_at: string;
  updated_at: string;

  // === RAW INPUTS (v1.1) - Preserved verbatim ===
  raw_inputs?: RawInputs;

  // === META OBSERVATIONS (v1.1) - AI analysis ===
  meta?: MetaObservations;

  // === VOICE PROFILE (v1.1) - Global tones ===
  voice_profile?: VoiceProfile;

  // === CORE IDENTITY (v1.0) ===
  identity: {
    name?: string;
    passions: ManifestItem[];
    purpose: ManifestItem[];
    superpowers: ManifestItem[];
    values: ManifestItem[];
  };

  // === INTERESTS & OBSESSIONS (v1.1) ===
  interests?: {
    topics: InterestItem[];
    people_who_fascinate?: string[];
    questions_curious_about?: string[];
  };

  // === LIFE CONTEXT (v1.0) ===
  life_context: {
    life_story_summary?: ManifestItem;
    eras: EraItem[];
    current_location?: LocationItem;
    places_lived?: LocationItem[];
  };

  // === RELATIONSHIPS (v1.0) ===
  relationships: {
    family: RelationshipItem[];
    important_people: RelationshipItem[];
    relationship_status?: string;
    social_energy?: "introvert" | "extrovert" | "ambivert";
  };

  // === GROWTH & CHALLENGES (v1.0) ===
  growth: {
    current_challenges: ManifestItem[];
    fears: ManifestItem[];
    goals_short_term: ManifestItem[];
    goals_long_term: ManifestItem[];
    patterns_trying_to_break?: ManifestItem[];
    growth_edges?: ManifestItem[];
  };

  // === DREAMS & FUTURE (v1.0) ===
  dreams: {
    vivid_future_scenes: ManifestItem[];
    bucket_list?: ManifestItem[];
    fantasy_selves?: ManifestItem[];
    dream_places?: string[];
  };

  // === WORLDVIEW (v1.0) ===
  worldview: {
    core_beliefs?: ManifestItem[];
    sources_of_meaning?: ManifestItem[];
    questions_wrestling_with?: ManifestItem[];
  };

  // === AESTHETIC & SENSORY (v1.1 - optional) ===
  aesthetic?: {
    visual_style?: string[];
    music_taste?: string[];
    comfort_media?: string[];
    aesthetic_keywords?: string[];
  };

  // === TEMPORAL (v1.1 - optional) ===
  temporal?: {
    birthday?: string; // "March 15, 1990" or "1990-03-15"
    season_of_life?: string;
    significant_dates?: DateItem[];
    time_preference?: {
      morning_energy: "high" | "medium" | "low";
      evening_energy: "high" | "medium" | "low";
    };
  };

  // === IMAGES (v1.1 - optional) ===
  images?: {
    profile_photos: ImageItem[];
    generation_consent: boolean;
    preferred_style?: "realistic" | "illustrated" | "cinematic";
  };

  // === SELF-AWARENESS (v1.1 - optional) ===
  self_awareness?: {
    how_others_see_them?: string[];
    how_they_see_themselves?: string[];
    compliments_that_land?: string[];
    criticism_that_stings?: string[];
  };

  // === CREATIVE (v1.1 - optional) ===
  creative?: {
    creative_outlets?: string[];
    things_they_make?: string[];
    dream_creative_projects?: ManifestItem[];
  };
}

// ============================================
// Weight Logic
// ============================================

export const INITIAL_WEIGHTS = {
  onboarding: 0.7,
  conversation: 0.6,
  user_edit: 0.9,
} as const;

export const WEIGHT_ADJUSTMENTS = {
  confirmed_in_conversation: 0.1, // Cap at 1.0
  referenced_in_generation: 0.05,
  not_referenced_30_days: -0.1, // Decay
  explicitly_confirmed: 0.9, // Set directly
  explicitly_removed: 0, // Soft delete
} as const;

// ============================================
// Tone Preferences (Separate from Identity)
// ============================================

export interface TonePreferences {
  user_id: string;
  banned_topics: string[];
  tone_dislikes: string[]; // "too_cheesy", "preachy", "generic"
  poster_affinities: Record<string, number>; // -1.0 to 1.0
  preferred_post_length?: "short" | "medium" | "long";
  created_at: string;
  updated_at: string;
}

// ============================================
// Helper: Create empty manifest
// ============================================

export function createEmptyManifest(userId: string): Omit<SoulManifest, "id"> {
  const now = new Date().toISOString();
  return {
    user_id: userId,
    schema_version: CURRENT_SCHEMA_VERSION,
    created_at: now,
    updated_at: now,
    raw_inputs: {},
    identity: {
      passions: [],
      purpose: [],
      superpowers: [],
      values: [],
    },
    interests: {
      topics: [],
    },
    life_context: {
      eras: [],
    },
    relationships: {
      family: [],
      important_people: [],
    },
    growth: {
      current_challenges: [],
      fears: [],
      goals_short_term: [],
      goals_long_term: [],
    },
    dreams: {
      vivid_future_scenes: [],
    },
    worldview: {},
  };
}

// ============================================
// Helper: Create ManifestItem
// ============================================

export function createManifestItem(
  value: string,
  source: ManifestItem["source"],
  contextTags?: string[]
): ManifestItem {
  return {
    id: crypto.randomUUID(),
    value,
    weight: INITIAL_WEIGHTS[source],
    context_tags: contextTags,
    source,
    created_at: new Date().toISOString(),
  };
}

