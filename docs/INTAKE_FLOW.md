# Intake Flow Documentation

## Philosophy

The intake should feel **light but capture rich data**. We use different input formats for different data types:

| Data Type | Input Format | Why |
|-----------|--------------|-----|
| Identity (passions, values) | Chips + text | Quick taps, common options |
| Lists (people, projects) | List builder | Structured, repeatable |
| Narratives (life story) | Text/textarea | Needs free expression |

**Phase 1** (Intake): Get the seeds — names, labels, quick selections.
**Phase 2** (Feed): Posters ask follow-up questions to deepen specific areas.

## Questions

### 1. Name
```typescript
{
  id: "name",
  type: "text",
  question: "What should I call you?",
  placeholder: "Your name or nickname",
  manifestPath: "identity.name",
}
```

### 2. Passions
```typescript
{
  id: "passions",
  type: "chips-with-text",
  question: "What are you passionate about?",
  chips: [
    "Making things", "Writing", "Design", "Technology",
    "Music", "Art", "Building businesses", "Helping people",
    "Learning", "Nature", "Health & fitness", "Philosophy",
  ],
  placeholder: "What else lights you up?",
  manifestPath: "identity.passions",
}
```

### 3. Superpowers
```typescript
{
  id: "superpowers",
  type: "chips-with-text",
  question: "What are your superpowers?",
  subtitle: "What do people come to you for?",
  chips: [
    "Writing", "Design", "Coding", "Strategy",
    "Connecting people", "Reading people", "Problem-solving",
    "Explaining complex things", "Leading", "Listening",
    "Creating systems", "Seeing patterns",
  ],
  placeholder: "Any other superpowers?",
  manifestPath: "identity.superpowers",
}
```

### 4. Projects
```typescript
{
  id: "projects",
  type: "list-builder",
  question: "What projects are you working on?",
  subtitle: "Active side projects, work stuff, creative pursuits...",
  itemFields: [
    { key: "name", placeholder: "Project name", width: "40%" },
    { key: "description", placeholder: "One line about it", width: "60%" },
  ],
  addButtonText: "+ Add another project",
  minItems: 0,
  maxItems: 8,
  manifestPath: "growth.active_projects",
}
```

### 5. Future Vision
```typescript
{
  id: "future",
  type: "text",
  multiline: true,
  question: "Wave a magic wand. It's 5 years from now and everything worked out.",
  subtitle: "What does your life look like? Be specific and vivid.",
  placeholder: "Where are you? What are you doing? Who's there?",
  manifestPath: "dreams.vivid_future_scenes",
}
```

### 6. Challenges
```typescript
{
  id: "challenges",
  type: "chips-with-text",
  question: "What's holding you back?",
  chips: [
    "Self-discipline", "Overthinking", "Fear of failure",
    "Perfectionism", "Procrastination", "Being too hard on myself",
    "Imposter syndrome", "Too many ideas, not enough focus",
    "Not enough time", "Motivation", "Burnout", "Loneliness",
  ],
  placeholder: "Anything else you're working through?",
  manifestPath: "growth.current_challenges",
}
```

### 7. Fears
```typescript
{
  id: "fears",
  type: "chips-with-text",
  question: "What are you afraid of?",
  chips: [
    "Being unremarkable", "Running out of time",
    "Never finding my person", "Financial instability",
    "Letting people down", "Missing my shot",
    "Being stuck", "Failing publicly", "Regret", "Being alone",
  ],
  placeholder: "What keeps you up at night?",
  manifestPath: "growth.fears",
}
```

### 8. Values
```typescript
{
  id: "values",
  type: "chips-with-text",
  question: "What values are non-negotiable for you?",
  chips: [
    "Honesty", "Curiosity", "Courage", "Kindness",
    "Excellence", "Freedom", "Authenticity", "Growth",
    "Loyalty", "Creativity", "Integrity", "Humility",
  ],
  placeholder: "Any others?",
  manifestPath: "identity.values",
}
```

### 9. Important People
```typescript
{
  id: "important_people",
  type: "list-builder",
  question: "Who are your people?",
  subtitle: "We'll get to know them better over time.",
  itemFields: [
    { key: "name", placeholder: "Name", width: "35%" },
    { key: "relation", placeholder: "Who they are to you", width: "65%" },
  ],
  addButtonText: "+ Add another person",
  minItems: 0,
  maxItems: 10,
  manifestPath: "relationships.important_people",
}
```

### 10. Location
```typescript
{
  id: "location",
  type: "text",
  question: "Where do you live?",
  placeholder: "City, neighborhood...",
  manifestPath: "life_context.current_location",
}
```

### 11. Life Story
```typescript
{
  id: "life_story",
  type: "text",
  multiline: true,
  question: "Give me the quick version of your story.",
  subtitle: "Where you started, where you've been, how you got here.",
  placeholder: "The journey so far...",
  manifestPath: "life_context.life_story_summary",
}
```

## Input Components

### ChipsWithText

Multi-select chips with optional custom text input.

```tsx
<ChipsWithText
  chips={["Option 1", "Option 2", ...]}
  placeholder="Anything else?"
  value={selectedChips}
  customValue={customText}
  onChange={(selected, custom) => {...}}
  maxChips={8}
/>
```

**Behavior:**
- Tap to select/deselect chips
- Type custom additions in text field
- Custom values split by comma on submit

### ListBuilder

Repeatable structured items.

```tsx
<ListBuilder
  fields={[
    { key: "name", placeholder: "Name", width: "40%" },
    { key: "description", placeholder: "Description", width: "60%" },
  ]}
  addButtonText="+ Add another"
  minItems={0}
  maxItems={10}
  value={items}
  onChange={(items) => {...}}
/>
```

**Behavior:**
- Each item gets a unique ID
- X button removes items (if above minItems)
- "Add another" appends empty item

## Progress Persistence

Answers are saved to localStorage on every step change:

```typescript
const STORAGE_KEY = "yellowpill_intake_progress";

// Save
localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
  answers, 
  step: currentStep 
}));

// Load (on mount)
const saved = localStorage.getItem(STORAGE_KEY);
if (saved) {
  const { answers, step } = JSON.parse(saved);
  setAnswers(answers);
  setCurrentStep(step);
}

// Clear (on successful submit)
localStorage.removeItem(STORAGE_KEY);
```

This ensures:
- Users don't lose progress on refresh
- Pressing Back doesn't wipe answers
- Progress clears only after successful submission

## Submit Flow

1. Collect all answers into flat object
2. Send to `/api/intake`
3. API uses Grok to extract structured manifest
4. Manifest saved to `soul_manifests` table
5. Redirect to `/feed`

**Loading State:**
- Full-screen with spinning yellow pill
- Rotating messages: "Processing...", "Building...", "Learning...", etc.

