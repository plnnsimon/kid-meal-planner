# AI Meal Planner — Agent Architecture

## Approach

Claude API + tool calling. No custom model training.
Agent reads/writes app data via Supabase tools. User chats in natural language.

---

## Stack

- **LLM**: Claude claude-haiku-4-5-20251001 (via Anthropic SDK)
- **Tools**: Supabase queries wrapped as callable functions
- **Transport**: Supabase Edge Function (handles API key server-side)
- **UI**: Chat panel inside existing Vue app

---

## Agent Tools

| Tool | Action | Supabase op |
|---|---|---|
| `get_child_profile` | Read child age + allergies | `children` table |
| `get_recipes` | List recipes (optional filters: allergens, meal type) | `recipes` table |
| `get_week_plan` | Read current week’s meal slots | `week_plans` + `meal_slots` |
| `set_meal_slot` | Assign recipe to a day+meal | INSERT/UPDATE `meal_slots` |
| `clear_meal_slot` | Remove recipe from a slot | DELETE `meal_slots` |
| `get_tasted_ingredients` | Read child’s tasted ingredients | `tasted_ingredients` |

---

## System Prompt Template

```
You are a meal planning assistant for a child’s weekly meals.

Child profile:
- Name: {child.name}
- Age: {child.age}
- Allergies: {child.allergies}
- Dietary restrictions: {child.restrictions}

Today: {date}
Current week: {weekStart} – {weekEnd}

Use the provided tools to read the current meal plan and recipes.
When user asks to plan meals — call set_meal_slot for each slot.
Always check allergies before assigning a recipe.
Respond in the same language the user writes in.

Assistant: I’m your meal planning assistant for {child.name}! How can I help you plan healthy meals this week?
```

---

## Edge Function

```
POST /functions/v1/ai-planner
Body: { messages: ChatMessage[], userId: string, weekPlanId: string }

1. Load child profile + current week plan (server-side Supabase query)
2. Build system prompt with injected context
3. Call Claude API with tools enabled
4. Handle tool_use blocks — execute Supabase ops
5. Loop until stop_reason = "end_turn"
6. Return final assistant message to client
```

---

## Vue UI

- New route: `/planner/chat`
- Component: `AIPlannerView.vue`
- Bottom nav tab or FAB entry point
- Chat thread: user bubbles right, assistant bubbles left
- Show tool calls as inline status chips ("Checking recipes...", "Moving Monday breakfast...", "Adding Monday breakfast...")
- Streaming optional (nice-to-have)

---

## Files to Create

```
supabase/
  functions/
    ai-planner/
      index.ts          # Edge function entry
      tools.ts          # Tool definitions + Supabase executors
      systemPrompt.ts   # System prompt builder

src/
  views/
    AIPlannerView.vue   # Chat UI
  stores/
    aiPlanner.store.ts  # Chat history, loading state, send message
  locales/
    en.ts               # Add ai_planner keys
    uk.ts               # Add ai_planner keys (Cyrillic)
  router/index.ts       # Add /planner/chat route
```

---

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...   # Set in Supabase Edge Function secrets
```

Never expose API key to frontend.

---

## Build Phases

| # | Phase | Scope |
|---|---|---|
| A | Edge Function + tools | `functions/ai-planner/` — Claude API + 6 tools |
| B | Vue store + view | `aiPlanner.store.ts` + `AIPlannerView.vue` |
| C | i18n + routing | locale keys + router entry + nav link |

---

## Constraints

- API key server-side only (Edge Function)
- Always filter recipes by child’s allergies before proposing
- Respect existing RLS — Edge Function uses user’s JWT, not service role key
- Tool calls must be atomic — one slot per `set_meal_slot` call
- Typecheck must pass: `npx vue-tsc --noEmit`