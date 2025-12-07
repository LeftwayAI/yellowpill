# Yellow Pill Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Next.js)                         │
├─────────────────────────────────────────────────────────────────┤
│  Landing → Login → Intake → Feed                                │
│     │        │        │       │                                 │
│     └────────┴────────┴───────┴──────────────────────────────┐  │
│                                                              │  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │  │
│  │   Header    │  │  DevPanel   │  │   Feed Components   │   │  │
│  │ (profile)   │  │ (dev tools) │  │   (posts, cards)    │   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │  │
└──────────────────────────────────────────────────────────────┴──┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API ROUTES (Next.js)                       │
├─────────────────────────────────────────────────────────────────┤
│  /api/intake     POST  Process answers, create manifest         │
│  /api/generate   POST  Generate posts from manifest             │
│  /api/feed       GET   Fetch user's posts                       │
│  /auth/callback  GET   Supabase auth redirect                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌───────────────────────┐   ┌───────────────────────┐
│      SUPABASE         │   │      xAI GROK         │
├───────────────────────┤   ├───────────────────────┤
│  • Auth (magic link)  │   │  • grok-3-mini        │
│  • Postgres DB        │   │  • Structured output  │
│  • RLS policies       │   │  • Content generation │
└───────────────────────┘   └───────────────────────┘
```

## Data Flow

### 1. Intake Flow

```
User Answers → /api/intake → Grok (extract structure) → soul_manifests
     │
     │  Questions:
     │  1. Name (text)
     │  2. Passions (chips)
     │  3. Superpowers (chips)
     │  4. Projects (list-builder)
     │  5. Future vision (text)
     │  6. Challenges (chips)
     │  7. Fears (chips)
     │  8. Values (chips)
     │  9. People (list-builder)
     │  10. Location (text)
     │  11. Life story (text)
     │
     ▼
   Grok API extracts:
   - Named entities
   - Themes and patterns
   - Weighted items
   - Structured relationships
```

### 2. Post Generation Flow

```
soul_manifests → /api/generate → Select Posters → Grok (per poster) → posts
                      │
                      │  For each post:
                      │  1. Pick poster (avoid recent)
                      │  2. Pick post_type from poster
                      │  3. Extract relevant manifest sections
                      │  4. Generate with Grok
                      │  5. Save to posts table
                      │
                      ▼
                 5 posts generated per request
```

### 3. Feed Flow

```
/api/feed → Query posts (unseen first) → Check count → Trigger generation?
     │
     │  If unseen < 5:
     │  └── Async call to /api/generate
     │
     ▼
   Return posts with poster info (joined)
```

## Database Schema

```sql
-- Core user data
soul_manifests (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users UNIQUE,
  manifest JSONB,  -- The Soul Manifest
  created_at, updated_at
)

-- AI personalities
posters (
  id TEXT PRIMARY KEY,  -- e.g., "scenes-future"
  name TEXT,
  avatar_gradient TEXT,  -- CSS gradient
  tagline TEXT,
  system_prompt TEXT,
  style_guide TEXT,
  post_types JSONB,  -- Array of {type, description, manifest_fields, max_length}
  manifest_sections TEXT[],  -- Which manifest paths this poster uses
  is_active BOOLEAN
)

-- Generated content
posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  poster_id TEXT REFERENCES posters,
  post_type TEXT,
  content TEXT,
  manifest_fields_used TEXT[],
  seen BOOLEAN,
  feedback TEXT CHECK (IN ('up', 'down'))
)
```

## Component Architecture

### Intake Page Components

```
IntakePage
├── Progress Bar
├── Question Renderer
│   ├── TextQuestion → <input> or <textarea>
│   ├── ChipsQuestion → <ChipsWithText>
│   └── ListQuestion → <ListBuilder>
├── Navigation (Back / Continue)
└── Loading State (spinning pill)
```

### Feed Page Components

```
FeedPage
├── Header (logo + profile menu)
├── Thought Input ("What's on your mind?")
└── Post List
    └── PostCard
        ├── Poster Avatar (accent color)
        ├── Poster Name + Verified Badge
        ├── Content
        └── Actions (👎 👍 🔖 ✏️)
```

## Authentication

**Current**: Supabase Magic Link
- User enters email
- Receives magic link
- Redirects to `/auth/callback`
- Session stored in cookies

**Dev Mode** (for testing):
- Toggle in DevPanel
- Bypasses all auth checks
- Uses mock user ID
- Stored in localStorage + cookie

**Future**: X (Twitter) OAuth
- Not yet implemented
- Would use Supabase OAuth provider

## Key Design Decisions

### 1. Structured Intake over Free-form

Instead of asking "tell me about yourself" and parsing everything, we use:
- **Chips** for common values (passions, fears, values)
- **List builders** for structured data (people, projects)
- **Text** only for narratives (life story, future vision)

This gives us cleaner manifest data.

### 2. Posters as Specialized Personalities

Each poster has:
- A specific **manifest focus** (which sections they read)
- Multiple **post types** they can generate
- A **system prompt** that defines their voice
- A **style guide** for consistency

This prevents generic content and ensures variety.

### 3. Feed-based Manifest Evolution

The feed isn't just output — it's a conversation loop:
- **The Mirror** asks "is this still true?"
- **Getting to Know You** asks follow-up questions
- User responses update the manifest over time

(Not fully implemented yet, but architected for it)

### 4. Client-side Generation Trigger

The feed page triggers generation client-side if posts are empty. This ensures:
- User always sees something
- Generation happens with proper auth context
- No complex background job system needed

## Performance Considerations

- **Manifest queries** use `.single()` for efficiency
- **Posts** are indexed on `(user_id, seen, created_at)`
- **Generation** happens async, doesn't block feed load
- **Images** are served from Next.js public folder (no CDN yet)

## Security

- **RLS** on all tables — users only see their own data
- **Anon key** only — service role not exposed to client
- **No secrets** in client code
- **CORS** handled by Supabase
