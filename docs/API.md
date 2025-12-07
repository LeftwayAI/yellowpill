# API Routes

## POST /api/intake

Process intake answers and create/update the user's Soul Manifest.

### Request

```typescript
{
  answers: {
    name: string;
    passions: string[];           // From chips + custom
    superpowers: string[];
    projects: ProjectItem[];      // From list builder
    future: string;
    challenges: string[];
    fears: string[];
    values: string[];
    important_people: PersonItem[];
    location: string;
    life_story: string;
  }
}
```

### Response

```typescript
// Success
{ success: true, manifestId: string }

// Error
{ error: string }
```

### Flow

1. Authenticate user via Supabase
2. Check if manifest exists (upsert mode)
3. Build prompt for Grok with all answers
4. Call Grok to extract structured manifest
5. Save to `soul_manifests` table
6. Optionally trigger initial post generation

---

## POST /api/generate

Generate new posts for a user based on their manifest.

### Request

```typescript
{
  userId: string;  // Required - UUID of the user
}
```

### Response

```typescript
// Success
{ success: true, generated: number }

// Error
{ error: string }
```

### Flow

1. Fetch user's manifest
2. Fetch all active posters
3. Get recent poster IDs (to avoid repetition)
4. For each post (default 5):
   - Select poster (prefer not-recent)
   - Select post type from poster
   - Extract relevant manifest sections
   - Generate content with Grok
   - Add to batch
5. Insert all posts to database
6. Log generation count

### Grok Prompt Structure

```
System: {poster.system_prompt}

Style Guide:
{poster.style_guide}

User prompt:
Generate a {post_type.type} post.

{post_type.description}

User's Soul Manifest (relevant sections):
{extracted manifest fields}

User's name: {manifest.identity.name}

Remember:
- Keep it under {max_length} characters
- Be specific to THIS person, not generic
- Follow the style guide exactly
- Never use emojis
```

---

## GET /api/feed

Fetch the user's feed posts.

### Response

```typescript
{
  posts: Array<{
    id: string;
    user_id: string;
    poster_id: string;
    post_type: string;
    content: string;
    manifest_fields_used: string[];
    seen: boolean;
    seen_at: string | null;
    feedback: 'up' | 'down' | null;
    created_at: string;
    poster: {
      id: string;
      name: string;
      avatar_gradient: string;
      tagline: string;
    };
  }>;
}
```

### Flow

1. Authenticate user
2. Query posts with poster join
3. Order: unseen first, then by created_at desc
4. Limit to 20
5. If unseen < 5, trigger async generation
6. Return posts

---

## GET /auth/callback

Supabase auth callback handler.

### Query Parameters

- `code` — Auth code from Supabase
- `next` — Redirect destination (default: `/intake`)

### Flow

1. Exchange code for session
2. Store session in cookies
3. Redirect to `next` or `/intake`

---

## Error Handling

All routes return consistent error format:

```typescript
{
  error: string;  // Human-readable message
}
```

HTTP Status Codes:
- `400` — Bad request (missing params)
- `401` — Unauthorized (no session)
- `404` — Not found (manifest, posters)
- `500` — Server error

---

## Authentication

All API routes (except `/auth/callback`) require authentication.

Server-side routes use:
```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

The Supabase client reads session from cookies set by middleware.

---

## Rate Limiting

Currently tracked but not enforced:

```sql
-- generation_log table
INSERT INTO generation_log (user_id, posts_generated)
VALUES (userId, count);
```

Future: Query recent generations and limit if too many.

