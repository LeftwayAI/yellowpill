# Yellow Pill - AI Assistant Context

> **One-liner**: A social feed where AI "posters" write personalized content based on your Soul Manifest — a structured representation of who you are.

## Quick Start

```bash
yarn dev          # Start dev server at localhost:3000
yarn build        # Production build
```

**Environment Variables** (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://fbdxqagsfcjorxwjxrnz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key>
XAI_API_KEY=<xai-grok-key>
```

## Project Status

**Working End-to-End Flow:**
1. ✅ Login (Supabase Auth with magic link)
2. ✅ Intake (11 questions with chips, text, list builders)
3. ✅ Manifest creation (Grok API extracts structured data)
4. ✅ Post generation (12 AI posters create personalized content)
5. ✅ Feed display (posts with poster info, feedback buttons)

**Dev Mode:**
- Toggle via gear icon (bottom-right) → "Enable Dev Mode"
- Bypasses auth, uses mock data
- "Re-intake" button clears progress and restarts flow

## Architecture

### Tech Stack
- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (Postgres + Auth)
- **AI**: xAI Grok API (grok-3-mini)
- **Fonts**: Satoshi (variable), Geist Mono

### Key Files

```
src/
├── app/
│   ├── page.tsx              # Landing page (yellow pill logo, "Let's go")
│   ├── login/page.tsx        # Magic link auth
│   ├── intake/page.tsx       # 11-step onboarding flow
│   ├── feed/page.tsx         # Main feed with posts
│   └── api/
│       ├── intake/route.ts   # Process answers → create manifest
│       ├── generate/route.ts # Generate posts from manifest
│       └── feed/route.ts     # Serve user's feed
├── components/
│   ├── Header.tsx            # App header with profile menu
│   ├── DevPanel.tsx          # Dev tools (bottom-right gear)
│   ├── ChipsWithText.tsx     # Multi-select + text input
│   └── ListBuilder.tsx       # Repeatable list items
├── lib/
│   ├── grok.ts               # xAI Grok API client
│   ├── dev-auth.ts           # Dev mode utilities, poster colors
│   └── supabase/
│       ├── client.ts         # Browser Supabase client
│       ├── server.ts         # Server Supabase client
│       └── middleware.ts     # Auth middleware
└── types/
    ├── manifest.ts           # Soul Manifest types
    └── database.ts           # Supabase table types
```

### Database Schema

**Tables** (all have RLS enabled):
- `soul_manifests` — User's structured personality data (JSONB)
- `tone_preferences` — How user wants to be talked to
- `posters` — AI personalities (12 total)
- `posts` — Generated content for users
- `conversations` — Chat threads with posters
- `generation_log` — Rate limiting

**Posters** (12 AI personalities):
| ID | Name | Color | Purpose |
|----|------|-------|---------|
| evergreen | Evergreen | 🟢 #71B280 | Local history, place connections |
| window-opener | Window Opener | 🔵 #2C5364 | "What if?" questions |
| from-you | From You | 🔴 #C94B4B | Letters from self to self |
| scenes-future | Scenes From Your Future | 🟣 #8E2DE2 | Vivid future visualizations |
| mirror | The Mirror | 🩵 #A8EDEA | Check-ins, "is this still true?" |
| sage | The Sage | ⚫ #5C5C5C | Stoic wisdom, reframes |
| archivist | The Archivist | 🟡 #C9A227 | Past reflections, growth acknowledgment |
| muse | The Muse | 🩷 #F5576C | Creative prompts |
| project-pulse | Project Pulse | 🔵 #3B82F6 | Project tracking |
| deepener | Getting to Know You | 🟣 #A855F7 | Follow-up questions |
| hype-man | Your Hype Man | 🟠 #F59E0B | Personalized affirmations |
| uncomfortable-truth | The Uncomfortable Truth | 🔴 #DC2626 | Tough love |

## Soul Manifest Structure

```typescript
interface SoulManifest {
  identity: {
    name: string;
    passions: ManifestItem[];
    superpowers: ManifestItem[];
    values: ManifestItem[];
    purpose: ManifestItem[];
  };
  dreams: {
    vivid_future_scenes: ManifestItem[];
    fantasy_selves: ManifestItem[];
  };
  growth: {
    current_challenges: ManifestItem[];
    fears: ManifestItem[];
    active_projects: ProjectItem[];
    goals_short_term: ManifestItem[];
    goals_long_term: ManifestItem[];
  };
  relationships: {
    important_people: PersonItem[];
    family: PersonItem[];
  };
  life_context: {
    current_location: LocationItem;
    eras: EraItem[];
    life_story_summary: ManifestItem;
  };
  worldview: Record<string, unknown>;
}
```

## Brand Guidelines

- **Background**: Pure black `#000000`
- **Primary Yellow**: `#FCC800`
- **Fonts**: Satoshi (body), Geist Mono (code/data)
- **Tone**: Cool, confident, wise, a little mysterious
- **No emojis** in AI-generated content

## Common Tasks

### Reset User Data (for testing)
```sql
DELETE FROM posts WHERE user_id = '<uuid>';
DELETE FROM soul_manifests WHERE user_id = '<uuid>';
```

### Add a New Poster
1. Insert into `posters` table (see `002_seed_posters.sql`)
2. Add color to `POSTER_COLORS` in `src/lib/dev-auth.ts`

### Modify Intake Questions
Edit `INTAKE_QUESTIONS` array in `src/app/intake/page.tsx`

## Known Issues / TODOs

- [ ] X (Twitter) OAuth not implemented yet (using magic link)
- [ ] Conversation layer (chat with posters) not built
- [ ] Image generation for "Scenes From Your Future" not implemented
- [ ] Rate limiting for post generation needs tuning
- [ ] Mobile responsiveness needs polish

## Supabase MCP

MCP is configured in `.cursor/mcp.json` for direct database access:
- `mcp_supabase_list_tables` — See all tables
- `mcp_supabase_execute_sql` — Run queries
- `mcp_supabase_apply_migration` — Apply schema changes

Project ID: `fbdxqagsfcjorxwjxrnz`

## References

- Original spec: `YELLOW_PILL_HANDOFF_V2.md` (in Google Drive)
- Brand docs: `docs/BRAND.md`
- Sample manifest: `ref/v1.json`

