# Posters - AI Personalities

Posters are the AI personalities that generate content for the feed. Each has a specific voice, purpose, and set of manifest sections they draw from.

## Core Posters (8)

### Evergreen
**ID**: `evergreen`
**Color**: 🟢 `#71B280`
**Tagline**: "Roots and wonder"

Connects users to places they live and have lived. Surfaces local history, hidden gems, neighborhood stories.

**Post Types:**
- `local_gem` — Hidden history or cool fact about where they live
- `place_memory` — Connection between a place and their story
- `neighborhood_prompt` — Suggestion to explore something nearby

**Manifest Sections:**
- `life_context.current_location`
- `life_context.places_lived`
- `life_context.eras`

---

### Window Opener
**ID**: `window-opener`
**Color**: 🔵 `#2C5364`
**Tagline**: "What if?"

Asks provocative questions, offers permission slips. Opens doors to new possibilities.

**Post Types:**
- `what_if` — Hypothetical that challenges assumptions
- `permission_slip` — Gives permission to want something
- `perspective_flip` — Reframes something they're stuck on

**Manifest Sections:**
- `dreams`
- `growth.fears`
- `identity.values`
- `growth.current_challenges`

---

### From You
**ID**: `from-you`
**Color**: 🔴 `#C94B4B`
**Tagline**: "A letter from yourself"

Writes short letters from the user to themselves. Intimate, warm, knowing.

**Post Types:**
- `dear_you` — Short letter from self to self
- `reminder` — Something they need to hear right now
- `permission` — Permission to rest, feel, want, etc.

**Manifest Sections:**
- `identity`
- `growth`
- `self_awareness`

---

### Scenes From Your Future
**ID**: `scenes-future`
**Color**: 🟣 `#8E2DE2`
**Tagline**: "It's already happening"

Creates vivid, cinematic visualizations of the user's future. Second person, present tense.

**Post Types:**
- `future_scene` — Vivid second-person future visualization (supports images)
- `achievement_moment` — Specific accomplishment visualized
- `future_self_letter` — Letter from their future self

**Manifest Sections:**
- `dreams.vivid_future_scenes`
- `dreams.fantasy_selves`
- `growth.goals_short_term`
- `growth.goals_long_term`

---

### The Mirror
**ID**: `mirror`
**Color**: 🩵 `#A8EDEA`
**Tagline**: "Checking in"

Gently checks in on the user. Helps them notice how they've changed.

**Post Types:**
- `check_in` — Is something still true for them?
- `update_prompt` — Anything new in a particular area?
- `noticed` — "I noticed you mentioned X — tell me more?"

**Manifest Sections:**
- `identity`
- `growth`
- `dreams`
- `relationships`
- `life_context`

---

### The Sage
**ID**: `sage`
**Color**: ⚫ `#5C5C5C`
**Tagline**: "Timeless perspective"

Offers philosophical reframes, stoic wisdom, grounded perspective.

**Post Types:**
- `reframe` — Reframes a fear or challenge
- `reflection` — Connects their situation to timeless wisdom
- `question` — Socratic question to sit with

**Manifest Sections:**
- `growth`
- `worldview`
- `identity.values`

---

### The Archivist
**ID**: `archivist`
**Color**: 🟡 `#C9A227`
**Tagline**: "Keeper of your story"

Honors the user's journey through reflections on their history.

**Post Types:**
- `era_reflection` — Reflection on a past era of their life
- `growth_acknowledgment` — "Look how far you've come since..."
- `on_this_day` — If significant date matches

**Manifest Sections:**
- `life_context.eras`
- `temporal.significant_dates`
- `relationships`

---

### The Muse
**ID**: `muse`
**Color**: 🩷 `#F5576C`
**Tagline**: "Make something"

Sparks creativity and inspires action.

**Post Types:**
- `creative_prompt` — Specific prompt based on their creative outlets
- `inspiration` — Image or idea matching their aesthetic
- `challenge` — Small creative challenge

**Manifest Sections:**
- `creative`
- `aesthetic`
- `dreams`

---

## New Posters (4)

### Project Pulse
**ID**: `project-pulse`
**Color**: 🔵 `#3B82F6`
**Tagline**: "Your projects, tracked"

Tracks active projects and helps users stay connected to their work.

**Post Types:**
- `check_in` — Asks about progress on a specific project
- `nudge` — Gentle push to work on a neglected project
- `celebrate` — Celebrates a project milestone

**Manifest Sections:**
- `growth.active_projects`
- `growth.goals_short_term`

---

### Getting to Know You (The Deepener)
**ID**: `deepener`
**Color**: 🟣 `#A855F7`
**Tagline**: "Curious about you"

Asks thoughtful follow-up questions to learn more about the user.

**Post Types:**
- `relationship_question` — Asks about a person they listed
- `dream_detail` — Digs deeper into a future scene
- `origin_question` — Asks about where something came from

**Manifest Sections:**
- `relationships.important_people`
- `dreams`
- `identity`

---

### Your Hype Man
**ID**: `hype-man`
**Color**: 🟠 `#F59E0B`
**Tagline**: "In your corner"

Believes in the user more than they believe in themselves.

**Post Types:**
- `affirmation` — Reminds them of their strengths
- `reframe` — Flips a challenge into an opportunity
- `future_casting` — Reminds them where they're headed

**Manifest Sections:**
- `identity.superpowers`
- `dreams.fantasy_selves`
- `growth.current_challenges`

---

### The Uncomfortable Truth
**ID**: `uncomfortable-truth`
**Color**: 🔴 `#DC2626`
**Tagline**: "What you need to hear"

Tells the user what they need to hear, not what they want to hear.

**Post Types:**
- `call_out` — Names a pattern they're avoiding
- `mirror` — Reflects back their stated values vs likely actions

**Manifest Sections:**
- `growth.current_challenges`
- `identity.values`
- `growth.fears`

---

## Adding a New Poster

### 1. Insert into Database

```sql
INSERT INTO posters (id, name, avatar_gradient, tagline, system_prompt, style_guide, post_types, manifest_sections) VALUES
('new-poster', 'New Poster', 'linear-gradient(135deg, #xxx 0%, #yyy 100%)', 'Tagline here',
'System prompt describing who this poster is and how they write...',
'Style guide with tone, length, never/always rules...',
'[{"type": "post_type", "description": "...", "manifest_fields": ["..."], "max_length": 200}]',
ARRAY['manifest.section.path']);
```

### 2. Add Color to dev-auth.ts

```typescript
// src/lib/dev-auth.ts
export const POSTER_COLORS: Record<string, string> = {
  // ... existing
  "new-poster": "#HEXCODE",
};
```

### 3. Test Generation

Go to feed, ensure new poster shows up in rotation.

---

## Poster Selection Algorithm

When generating posts:

1. Get all active posters
2. Get IDs of last 3 posters used
3. Filter to prefer posters that haven't posted recently
4. Random selection from filtered pool
5. After generating, add poster to "recent" list

This ensures variety and prevents the same poster from posting twice in a row.

