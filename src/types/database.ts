// Database types for Supabase
// These match the SQL schema

import type { SoulManifest, TonePreferences } from "./manifest";

// JSON types for JSONB columns
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      soul_manifests: {
        Row: {
          id: string;
          user_id: string;
          schema_version: string;
          manifest: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          schema_version?: string;
          manifest: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          schema_version?: string;
          manifest?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      tone_preferences: {
        Row: {
          id: string;
          user_id: string;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      posters: {
        Row: {
          id: string;
          name: string;
          avatar_gradient: string;
          tagline: string;
          system_prompt: string;
          style_guide: string;
          post_types: Json;
          manifest_sections: string[];
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          avatar_gradient: string;
          tagline: string;
          system_prompt: string;
          style_guide: string;
          post_types?: Json;
          manifest_sections: string[];
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          avatar_gradient?: string;
          tagline?: string;
          system_prompt?: string;
          style_guide?: string;
          post_types?: Json;
          manifest_sections?: string[];
          is_active?: boolean;
          created_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          poster_id: string;
          post_type: string;
          content: string;
          image_url: string | null;
          manifest_fields_used: string[] | null;
          seen: boolean;
          seen_at: string | null;
          feedback: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          poster_id: string;
          post_type: string;
          content: string;
          image_url?: string | null;
          manifest_fields_used?: string[] | null;
          seen?: boolean;
          seen_at?: string | null;
          feedback?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          poster_id?: string;
          post_type?: string;
          content?: string;
          image_url?: string | null;
          manifest_fields_used?: string[] | null;
          seen?: boolean;
          seen_at?: string | null;
          feedback?: string | null;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          post_id: string | null;
          poster_id: string | null;
          messages: Json;
          manifest_updates: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id?: string | null;
          poster_id?: string | null;
          messages?: Json;
          manifest_updates?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string | null;
          poster_id?: string | null;
          messages?: Json;
          manifest_updates?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      generation_log: {
        Row: {
          id: string;
          user_id: string;
          posts_generated: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          posts_generated: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          posts_generated?: number;
          created_at?: string;
        };
      };
    };
  };
}

// ============================================
// Supporting Types
// ============================================

export interface PostType {
  type: string;
  description: string;
  manifest_fields: string[];
  max_length: number;
  supports_images?: boolean;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ManifestUpdate {
  path: string; // Dot notation: "dreams.vivid_future_scenes"
  action: "add" | "update" | "remove";
  value?: unknown;
  reason: string;
}

// ============================================
// Typed versions for app use
// ============================================

export interface Poster {
  id: string;
  name: string;
  avatar_gradient: string;
  tagline: string;
  system_prompt: string;
  style_guide: string;
  post_types: PostType[];
  manifest_sections: string[];
  is_active: boolean;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  poster_id: string;
  post_type: string;
  content: string;
  image_url: string | null; // For image-capable posts
  manifest_fields_used: string[] | null;
  seen: boolean;
  seen_at: string | null;
  feedback: "up" | "down" | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  post_id: string | null;
  poster_id: string | null;
  messages: ConversationMessage[];
  manifest_updates: ManifestUpdate[] | null;
  created_at: string;
  updated_at: string;
}

// Re-export manifest types
export type { SoulManifest, TonePreferences };
