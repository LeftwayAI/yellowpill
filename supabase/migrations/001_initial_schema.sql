-- Yellow Pill Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- SOUL MANIFESTS
-- ============================================
create table if not exists soul_manifests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  schema_version text not null default '1.0',
  manifest jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table soul_manifests enable row level security;

-- Users can only access their own manifest
create policy "Users can view own manifest"
  on soul_manifests for select
  using (auth.uid() = user_id);

create policy "Users can insert own manifest"
  on soul_manifests for insert
  with check (auth.uid() = user_id);

create policy "Users can update own manifest"
  on soul_manifests for update
  using (auth.uid() = user_id);

-- ============================================
-- TONE PREFERENCES
-- ============================================
create table if not exists tone_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  preferences jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table tone_preferences enable row level security;

create policy "Users can view own tone preferences"
  on tone_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert own tone preferences"
  on tone_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tone preferences"
  on tone_preferences for update
  using (auth.uid() = user_id);

-- ============================================
-- POSTERS (AI Personalities)
-- ============================================
create table if not exists posters (
  id text primary key,
  name text not null,
  avatar_gradient text not null,
  tagline text not null,
  system_prompt text not null,
  style_guide text not null,
  post_types jsonb not null default '[]',
  manifest_sections text[] not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Posters are public/readable by all authenticated users
alter table posters enable row level security;

create policy "Posters are viewable by authenticated users"
  on posters for select
  to authenticated
  using (true);

-- ============================================
-- POSTS (The Feed Queue)
-- ============================================
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  poster_id text references posters(id) not null,
  post_type text not null,
  content text not null,
  manifest_fields_used text[],
  seen boolean default false,
  seen_at timestamptz,
  feedback text check (feedback in ('up', 'down')),
  created_at timestamptz default now()
);

alter table posts enable row level security;

create policy "Users can view own posts"
  on posts for select
  using (auth.uid() = user_id);

create policy "Users can insert own posts"
  on posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own posts"
  on posts for update
  using (auth.uid() = user_id);

-- Index for efficient feed queries
create index if not exists posts_user_seen_idx on posts(user_id, seen, created_at desc);

-- ============================================
-- CONVERSATIONS
-- ============================================
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  post_id uuid references posts(id),
  poster_id text references posters(id),
  messages jsonb not null default '[]',
  manifest_updates jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table conversations enable row level security;

create policy "Users can view own conversations"
  on conversations for select
  using (auth.uid() = user_id);

create policy "Users can insert own conversations"
  on conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own conversations"
  on conversations for update
  using (auth.uid() = user_id);

-- ============================================
-- GENERATION LOG (Rate Limiting)
-- ============================================
create table if not exists generation_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  posts_generated int not null,
  created_at timestamptz default now()
);

alter table generation_log enable row level security;

create policy "Users can view own generation log"
  on generation_log for select
  using (auth.uid() = user_id);

create policy "Users can insert own generation log"
  on generation_log for insert
  with check (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_soul_manifests_updated_at
  before update on soul_manifests
  for each row execute function update_updated_at_column();

create trigger update_tone_preferences_updated_at
  before update on tone_preferences
  for each row execute function update_updated_at_column();

create trigger update_conversations_updated_at
  before update on conversations
  for each row execute function update_updated_at_column();

