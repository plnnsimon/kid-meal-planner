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
Supports real Supabase auth (login/register) with a friends/social layer.

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
  i18n.ts                  # vue-i18n setup (en + uk locales)
  locales/
    en.ts                  # English strings
    uk.ts                  # Ukrainian strings (native Cyrillic, no Unicode escapes)
  lib/
    supabase.ts            # Supabase client singleton
    cookieStorage.ts       # Cookie-backed GoTrueClient storage adapter
  vite-env.d.ts            # Vite ImportMeta types
  main.ts                  # App entry — createApp, Pinia, Router, i18n
  App.vue                  # Shell: AppHeader + RouterView + BottomNav
  router/index.ts          # Routes + auth guard (active)
  data/
    common-ingredients.json  # Seed list for ingredient autocomplete
  stores/
    auth.store.ts          # Real Supabase auth — login/register/logout, session init
    child.store.ts         # Child profile CRUD (Supabase)
    recipe.store.ts        # Recipe CRUD + image upload (Supabase Storage)
    weekPlan.store.ts      # Week plan + meal slots CRUD (Supabase)
    profile.store.ts       # Public user profile CRUD (profiles table)
    friends.store.ts       # Friendships CRUD — send/accept/decline/remove
    ingredients.store.ts   # Food items CRUD — common seed + user custom ingredients, tasted tracking
  composables/
    useAllergyCheck.ts     # Checks recipe allergens vs child profile
    useIngredientSearch.ts # Autocomplete over ingredients store (DB + common-ingredients seed)
    useLocale.ts           # Locale switching helper (i18n)
    useShoppingList.ts     # Derives grouped shopping list from week plan
  components/
    layout/
      AppHeader.vue        # Sticky header; shows back arrow on sub-pages
      BottomNav.vue        # 4-tab fixed bottom nav (Plan/Recipes/Shopping/Settings)
    common/
      AllergyChip.vue      # Toggleable pill chip (active = orange)
      AppButton.vue        # Reusable button with primary/secondary variants
      AppInput.vue         # Reusable text input with label + error slot
      ImageUpload.vue      # Tap-to-upload image area (circle or rect)
    recipe/
      RecipeCard.vue       # Grid card: photo, name, kcal, allergen badges
      RecipeForm.vue       # Full recipe create/edit form (v-model:RecipePayload)
      NutritionBadge.vue   # Calorie + macro coloured pills
      IngredientPicker.vue # Autocomplete ingredient input used in RecipeForm
    meal/
      MealSlotCard.vue     # Single meal slot — empty or filled; opens preview modal
      DayColumn.vue        # One day: 4 MealSlotCards + opens MealPickerModal
      MealPickerModal.vue  # Bottom sheet: search/filter recipes, allergy warning
      RecipePreviewModal.vue  # Tap-on-slot modal: shows recipe details before removing
    shopping/
      ShoppingGroupSection.vue  # One collapsible group in the shopping list
  views/
    WeekPlanView.vue         # 7-day horizontal scroll, week nav arrows
    RecipeLibraryView.vue    # Grid + search/filter + FAB; shows bookmarked recipes
    RecipeDetailView.vue     # Create / edit / delete recipe
    ShoppingListView.vue     # Grouped shopping list derived from current week plan
    SettingsView.vue         # Child profile, allergies, dietary restrictions, account
    LoginView.vue            # Login + register form (Supabase auth, active)
    FriendsView.vue          # Friends list, pending requests, add-friend search
    FriendProfileView.vue    # Public profile of a friend
    FriendRecipeView.vue     # Read-only recipe detail from a friend's library
supabase/
  migrations/
    001_initial_schema.sql   # Core schema (recipes, week_plans, meal_slots, children)
    002_auth_schema.sql      # RLS policies for auth users
    003_profiles.sql         # profiles table (display_name, avatar_url, bio)
    004_friendships.sql      # friendships table (sender, receiver, status)
    005_social_rls.sql       # RLS for profiles + friendships + social recipe access
```

---

## Auth Strategy (Supabase auth — active)

Real auth is **enabled**. `LoginView.vue` is the app entry point for unauthenticated users.

- `auth.store.ts` — `useAuthStore` holds a `Session`, exposes `userId`, `isAuthenticated`, `login`, `register`, `logout`, `init`
- `lib/cookieStorage.ts` — custom GoTrueClient storage so the session survives page reloads without relying on localStorage only
- Route guard in `router/index.ts` is **active** — unauthenticated users are redirected to `/login`
- RLS policies are applied in migrations `002` – `005`
- "Remember me" flag persists the session in `localStorage`; without it the session is `sessionStorage`-only

---

## Supabase Patterns

```typescript
// Client
import { supabase } from '@/lib/supabase'

// Always scope queries by user_id (auth.userId from useAuthStore)
const { data } = await supabase
  .from('recipes')
  .select('*')
  .eq('user_id', auth.userId)

// Storage — two buckets: 'recipe-images', 'child-avatars'
const { error } = await supabase.storage
  .from('recipe-images')
  .upload(path, file, { upsert: true })

const { data } = supabase.storage.from('recipe-images').getPublicUrl(path)

// Friendships
const { data } = await supabase
  .from('friendships')
  .select('*')
  .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)

// Profiles (public)
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', targetUserId)
  .single()
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
| 9 | Friends system (friendships table, friends.store.ts, FriendsView, FriendProfileView) | ✅ Done |
| 10 | Social content viewing + recipe bookmarks (FriendRecipeView, bookmarked recipes in picker) | ✅ Done |
| 11 | i18n (vue-i18n, en + uk locales, locale switcher in Settings) | ✅ Done |

---

## Typecheck

```bash
cd D:/study/claude/kid-meal-planner
npx vue-tsc --noEmit
```

Must exit with **0 errors** before any phase is marked done.
