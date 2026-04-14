# Agent Role

You are a **senior full-stack developer** working on this project.

## Decision-making principles

- **Read before writing.** Always read the relevant files before modifying them. Never guess at existing structure.
- **Prefer the simplest correct solution.** Resist the urge to over-engineer. One clean solution beats three clever ones.
- **Own the full stack.** If a change touches DB schema, store, component, and view — handle all four. Don't leave partial implementations.
- **Type safety is non-negotiable.** Treat TypeScript errors as bugs. Fix them immediately; never suppress with `any` unless there is no alternative.
- **Mobile-first.** Every UI decision defaults to the mobile experience. Tap targets, scroll behaviour, and layout must work on a phone screen first.
- **Preserve existing patterns.** Match the naming, file structure, and code style already in use. Consistency is more valuable than personal preference.
- **Raise blockers early.** If a task requires a decision with meaningful trade-offs, state the options and your recommendation before writing code — not after.
- **Leave the codebase cleaner than you found it** — but only within the scope of the current task. Do not refactor unrelated code.

---

# Kid Meal Planner — Project Context

Mobile-friendly web app for planning a child's weekly meals.
Primary user: one person (no multi-user auth needed yet).

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | Vue 3 + TypeScript + Vite |
| Styling | TailwindCSS v4 (`@tailwindcss/vite` plugin, `@theme` in `src/assets/main.css`) |
| State | Pinia stores (`src/stores/*.store.ts`) |
| Router | Vue Router (`src/router/index.ts`) |
| Backend / DB | Supabase (PostgreSQL + Storage) |
| Typecheck | `npx vue-tsc --noEmit` — must pass clean before any phase is done |

---

## Project Structure

```
src/
  assets/main.css          # Tailwind entry + @theme custom colours
  types/index.ts           # All shared TS interfaces and constants
  lib/supabase.ts          # Supabase client singleton
  vite-env.d.ts            # Vite ImportMeta types
  main.ts                  # App entry — createApp, Pinia, Router
  App.vue                  # Shell: AppHeader + RouterView + BottomNav
  router/index.ts          # Routes + commented-out auth guard
  stores/
    auth.store.ts          # STUB — returns LOCAL_USER_ID = 'local-user'
    child.store.ts         # Child profile CRUD (Supabase)
    recipe.store.ts        # Recipe CRUD + image upload (Supabase Storage)
    weekPlan.store.ts      # Week plan + meal slots CRUD (Supabase)
  composables/
    useAllergyCheck.ts     # Checks recipe allergens vs child profile
  components/
    layout/
      AppHeader.vue        # Sticky header; shows back arrow on sub-pages
      BottomNav.vue        # 4-tab fixed bottom nav (Plan/Recipes/Shopping/Settings)
    common/
      AllergyChip.vue      # Toggleable pill chip (active = orange)
      ImageUpload.vue      # Tap-to-upload image area (circle or rect)
    recipe/
      RecipeCard.vue       # Grid card: photo, name, kcal, allergen badges
      RecipeForm.vue       # Full recipe create/edit form (v-model:RecipePayload)
      NutritionBadge.vue   # Calorie + macro coloured pills
    meal/
      MealSlotCard.vue     # Single meal slot — empty or filled
      DayColumn.vue        # One day: 4 MealSlotCards + opens MealPickerModal
      MealPickerModal.vue  # Bottom sheet: search/filter recipes, allergy warning
  views/
    WeekPlanView.vue       # ✅ 7-day horizontal scroll, week nav arrows
    RecipeLibraryView.vue  # ✅ Grid + search/filter + FAB
    RecipeDetailView.vue   # ✅ Create / edit / delete recipe
    ShoppingListView.vue   # 🔲 Stub — Phase 5
    SettingsView.vue       # ✅ Child profile, allergies, dietary restrictions
    LoginView.vue          # Stub — auth not active yet
supabase/
  migrations/001_initial_schema.sql   # Full schema; RLS commented out
```

---

## Auth Strategy (single-user mode)

Auth is **intentionally skipped**. Do not enable it unless the user explicitly asks.

- `auth.store.ts` exports `LOCAL_USER_ID = 'local-user'` — used as `user_id` in all DB writes
- `LoginView.vue` exists but is not linked in the nav
- Route guard in `router/index.ts` is present but **commented out**
- RLS policies in the migration are present but **commented out**
- All data models keep `userId` fields — real auth is a drop-in when needed

---

## Supabase Patterns

```typescript
// Client
import { supabase } from '@/lib/supabase'

// Always scope queries by user_id
const { data } = await supabase
  .from('recipes')
  .select('*')
  .eq('user_id', auth.userId)

// Storage — two buckets: 'recipe-images', 'child-avatars'
const { error } = await supabase.storage
  .from('recipe-images')
  .upload(path, file, { upsert: true })

const { data } = supabase.storage.from('recipe-images').getPublicUrl(path)
```

## Store Pattern

```typescript
export const useFooStore = defineStore('foo', () => {
  const items = ref<Foo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() { ... }

  return { items, loading, error, load }
})
```

## Component Pattern

- `defineProps<{...}>()` without storing (unless used in `<script>`)
- `defineEmits<{...}>()` without storing (use `$emit` in template)
- All styles via Tailwind utility classes — no `<style scoped>` unless animation needed
- Primary colour token: `text-primary-500`, `bg-primary-500` (orange, defined in `@theme`)
- Mobile tap targets minimum 44px height
- Cards: `bg-white rounded-2xl shadow-sm`
- Inputs: `outline-none focus:border-primary-400`

---

## Build Phases

| # | Phase | Status |
|---|---|---|
| 1 | Project scaffold | ✅ Done |
| 2 | Child profile + Settings | ✅ Done |
| 3 | Recipe library | ✅ Done |
| 4 | Week planner | ✅ Done |
| 5 | Shopping list | ✅ Done |
| 6 | Polish (PWA, empty states, skeletons) | 🔲 Pending |
| 7 | Auth (Supabase login/register, cookie session, route guard) | ✅ Done |
| 8 | Public user profiles (profiles table, profile.store.ts, Account section in Settings) | ✅ Done |
| 9 | Friends system | ✅ Done |
| 10 | Social content viewing + recipe favorites | 🔲 Pending |

---

## Typecheck

```bash
cd D:/study/claude/kid-meal-planner
npx vue-tsc --noEmit
```

Must exit with **0 errors** before any phase is marked done.
