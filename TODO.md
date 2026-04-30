# Scaling Roadmap — Kid Meal Planner

Each phase is a single Agent call.  
Run `npx vue-tsc --noEmit` before marking any phase done.

---

## Multi-Child Feature

### Business Decisions (confirmed before coding)

| Question | Decision |
|---|---|
| Existing single-child users | Auto-migrated — first child by `created_at`, zero data loss |
| Recipes shared across children? | Yes — recipes are user-scoped, shared |
| Shopping list scope | Selected child only (not merged) |
| Child selection persistence | `localStorage` key `kid-planner-selected-child-{userId}` |
| Child ID in URL routes? | No — global `selectedChildId` in store |
| Child switcher visibility | Hidden when user has exactly 1 child |
| Max children limit | Not enforced now; hook exists in Phase 15 (Free: 1, Pro: unlimited) |
| User with 0 children | Show "Add a child first" empty state in WeekPlanView |
| Birthday modal | Loop over all children; show modal for any with today's birthday |
| AI planner | Uses selected child's allergies + dietary restrictions |
| Friends / leaderboard | Per-user (aggregated) — unchanged |

---

### What Changes vs What Stays

**Unchanged:**
- Recipes (user-scoped — intentional)
- Friends system, leaderboard
- Feedback / admin
- Subscriptions, auth

**DB migrations:**
- `week_plans` — add `child_id` FK, update UNIQUE constraint, backfill
- `child_profiles` — add index on `user_id`
- Storage avatar path: `{userId}/{childId}/avatar.{ext}` (old URLs still valid until re-upload)

**Stores:**
- `child.store.ts` — biggest change: list, select, full CRUD
- `weekPlan.store.ts` — all queries scoped by `selectedChildId`
- `ingredients.store.ts` — `child.profile.id` → `child.selectedChild.id`

**Composables:**
- `useAllergyCheck.ts` — `child.profile?.allergies` → `child.selectedChild?.allergies`
- `useShoppingList.ts` — indirect fix via weekPlan store

**UI:**
- `SettingsView.vue` — child list + add/delete + edit panel
- `WeekPlanView.vue` — child switcher above calendar
- `App.vue` — `checkBirthday()` loops all children
- `ShoppingListView.vue` — show child name in header

**New components:**
- `ChildCard.vue` — avatar + name pill, used in switcher + settings list

---

### Key Risks

- **Backfill:** Users with no `child_profiles` row get `child_id = NULL` on week plans. Guard in store: check `selectedChildId !== null` before querying.
- **Storage path change:** Old avatar URLs stay valid until re-upload. No storage migration needed.
- **Tasted ingredients:** Already child-scoped at DB level. Only store reference needs updating.

---

### Phase 21 — DB Schema + child.store.ts Refactor

**Migration `016_multi_child.sql`:**
```sql
-- Add child_id to week_plans
ALTER TABLE week_plans
  ADD COLUMN child_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE;

-- Backfill: assign each plan to the user's first child
UPDATE week_plans wp
SET child_id = (
  SELECT id FROM child_profiles cp
  WHERE cp.user_id::text = wp.user_id::text
  ORDER BY cp.created_at ASC
  LIMIT 1
);

-- Drop old UNIQUE, add new one
ALTER TABLE week_plans DROP CONSTRAINT IF EXISTS week_plans_user_id_week_start_date_key;
ALTER TABLE week_plans ADD CONSTRAINT week_plans_child_week_unique
  UNIQUE (child_id, week_start_date);

-- Index for fast child listing
CREATE INDEX IF NOT EXISTS idx_child_profiles_user_id ON child_profiles(user_id);
```

**child.store.ts changes:**
- `children: ref<ChildProfile[]>([])` replaces `profile: ref<ChildProfile | null>(null)`
- `selectedChildId: ref<string | null>(null)` — persisted to localStorage
- `selectedChild: computed(...)` — active child object
- `load()` — fetch all children, restore `selectedChildId` from localStorage
- `select(id)` — switch active child, persist to localStorage
- `add(payload)` / `update(id, payload)` / `remove(id)` — full CRUD
- Avatar path: `${userId}/${childId}/avatar.${ext}`

**weekPlan.store.ts changes:**
- All queries: `.eq('child_id', childStore.selectedChildId)`
- `watch` on `selectedChildId` → auto-reload plan

**Other store + composable changes:**
- `useAllergyCheck.ts`: `child.profile?.allergies` → `child.selectedChild?.allergies`
- `ingredients.store.ts`: `child.profile?.id` → `child.selectedChild?.id`
- `App.vue`: `checkBirthday()` loops `child.children`

**Done when:**
- [ ] Migration `016` applied, backfill verified
- [ ] `child.store.ts` exposes `children[]`, `selectedChild`, `select()`, `add()`, `update()`, `remove()`
- [ ] `weekPlan.store.ts` scoped by `child_id`, auto-reloads on child switch
- [ ] `useAllergyCheck.ts` uses `selectedChild`
- [ ] `ingredients.store.ts` uses `selectedChild.id`
- [ ] `App.vue` birthday check loops all children
- [ ] Typecheck passes clean

---

### Phase 22 — Settings UI: Child Management

**SettingsView.vue becomes two-panel flow:**
1. Child list — `ChildCard` per child (avatar + name); "Add child" button
2. Child edit panel — existing fields (name, birthday, allergies, diet, avatar) + "Delete child" (ConfirmModal, variant=danger)

**New component:** `src/components/common/ChildCard.vue`
- Props: `child: ChildProfile`, `active: boolean`
- Shows avatar circle + name; active = orange ring

**i18n keys to add (en + uk):**
- `child.addChild`, `child.editChild`, `child.deleteChild`
- `child.confirmDelete`, `child.noChildren`, `child.switchChild`

**Done when:**
- [ ] `ChildCard.vue` component exists
- [ ] SettingsView shows child list with add/edit/delete
- [ ] Delete triggers ConfirmModal, cascades via `child.remove(id)`
- [ ] i18n keys added in both locales
- [ ] Typecheck passes clean

---

### Phase 23 — Week Plan UI: Child Switcher

**WeekPlanView.vue changes:**
- Horizontal scroll row of `ChildCard` pills above the 7-day calendar
- Active child highlighted (orange ring)
- Tapping calls `child.select(id)` → weekPlan auto-reloads via watcher
- Hidden when `child.children.length <= 1`
- Empty state: "Add a child in Settings to start planning" when `children.length === 0`

**ShoppingListView.vue:**
- Add selected child's name to page header: "Shopping for {name}"

**AIPlannerView.vue:**
- Pass `selectedChild.allergies` + `selectedChild.dietaryRestrictions` in AI context

**Done when:**
- [ ] Child switcher visible in WeekPlanView when 2+ children
- [ ] Switching child reloads plan with correct data
- [ ] Switcher hidden for single-child users
- [ ] Shopping list header shows child name
- [ ] AI planner uses selected child context
- [ ] Typecheck passes clean

---

## AI Quick Generate

Four one-tap generation modes accessible from a speed dial in WeekPlanView.

### Subscription gating

| Mode | Basic | Pro |
|---|---|---|
| Generate for a week | ✗ (pro_required) | ✅ |
| Generate for a day | ✅ | ✅ |
| Generate 1 recipe | ✅ | ✅ |
| Chat | ✅ | ✅ |

Every quick call = 1 generation (same as 1 chat message). Basic limit: 10/month.

### Architecture

No new edge function. Extend `ai-planner` with a `mode` field:

```
POST ai-planner
{
  mode: 'chat' | 'quick_week' | 'quick_day' | 'quick_recipe'
  messages?: [...]      // only for 'chat' mode
  dayOfWeek?: 0–6      // quick_day / quick_recipe
  mealType?: MealType  // quick_recipe
  userId, weekPlanId
}
```

Edge function auto-builds the messages array for quick modes. `quick_week` rejected server-side with `{ error: 'pro_required' }` if not Pro.

### UI: Speed Dial (replaces current FAB in WeekPlanView)

```
[robot FAB] → tap → expand upward:
  [week icon]   Generate for a week   (lock + upgrade CTA for Basic)
  [day icon]    Generate for a day    → QuickGenerateModal (day picker)
  [fork icon]   Generate 1 recipe     → QuickGenerateModal (day + meal type pickers)
  [chat icon]   Open chat             → /planner/chat
```

After any quick generate succeeds → `weekPlan.load()` auto-reloads slots.

---

### Phase 24 — Edge Function: Quick Generate Mode

**`supabase/functions/ai-planner/index.ts`:**
- Accept `mode`, `dayOfWeek`, `mealType` in request body
- `mode === 'chat'` → existing behavior unchanged
- Quick modes: build `messages` array automatically:
  - `quick_week`: `"Plan this week. Fill all empty meal slots for all 7 days."`
  - `quick_day`: `"Plan all meals for [DayName]. Fill empty breakfast, lunch, dinner, snack slots."`
  - `quick_recipe`: `"Generate a recipe for [mealType] on [DayName] and add it to the plan."`
- `quick_week`: return `{ error: 'pro_required' }` (HTTP 402) if not Pro
- All quick modes still count as 1 generation for Basic users

**Done when:**
- [ ] Edge function accepts `mode` field without breaking existing chat calls
- [ ] `quick_week` blocked for Basic with `pro_required` error
- [ ] `quick_day` + `quick_recipe` resolve correctly with auto-built messages
- [ ] Deployed and smoke-tested via curl

---

### Phase 25 — Store + UI

**`stores/aiPlanner.store.ts`:**
- Add `quickLoading: ref(false)`, `quickError: ref<string | null>(null)`
- Add `quickGenerate(mode, options: { dayOfWeek?: number; mealType?: string }): Promise<boolean>`
- On success: return `true`; on `limit_reached` or `pro_required`: set `quickError`, return `false`
- After success: call `subscriptionStore.refresh()`

**New `components/meal/AIPlannerSpeedDial.vue`:**
- Floating button (robot icon) — tap to toggle expanded state
- Backdrop div (transparent, full-screen) closes dial on outside tap
- 4 sub-buttons animate in (slide up + fade)
- Week button: disabled + lock icon + tooltip for Basic; calls `quickGenerate('quick_week')` for Pro
- Day + Recipe buttons: open `QuickGenerateModal` with correct mode prop
- Chat button: `RouterLink` to `/planner/chat`

**New `components/meal/QuickGenerateModal.vue`:**
- Bottom sheet modal
- Props: `mode: 'quick_day' | 'quick_recipe'`
- `quick_day`: day-of-week select (Mon–Sun, defaults to today)
- `quick_recipe`: day-of-week + meal type selects
- Generate button → `aiPlanner.quickGenerate(mode, { dayOfWeek, mealType })`
- Loading state on button; show error inline on failure with upgrade CTA on `limit_reached` / `pro_required`
- On success: `emit('done')` → close modal
- Errors `limit_reached` + `pro_required`: show upgrade CTA linking to `/settings`

**`views/WeekPlanView.vue`:**
- Remove `RouterLink` FAB
- Add `<AIPlannerSpeedDial @done="weekPlan.load()" />`

**Done when:**
- [ ] `aiPlanner.store.ts` has `quickGenerate` action
- [ ] `AIPlannerSpeedDial.vue` renders all 4 options; Pro gate visible for Basic
- [ ] `QuickGenerateModal.vue` opens for day + recipe modes; submits and emits `done`
- [ ] `WeekPlanView.vue` reloads slots after successful generation
- [ ] Typecheck passes clean

---

### Phase 26 — i18n

**`locales/en.ts` + `locales/uk.ts`** — add under `aiPlanner`:

```
aiPlanner.quick.title
aiPlanner.quick.week
aiPlanner.quick.day
aiPlanner.quick.recipe
aiPlanner.quick.chat
aiPlanner.quick.generating
aiPlanner.quick.proRequired
aiPlanner.quick.selectDay
aiPlanner.quick.selectMeal
aiPlanner.quick.generate
```

**Done when:**
- [ ] All new keys present in both `en.ts` and `uk.ts`
- [ ] No raw strings in `AIPlannerSpeedDial.vue` or `QuickGenerateModal.vue`
- [ ] Typecheck passes clean

---

## Phase 15 — Paid Subscription (Stripe)

**Trial:** 14-day free Pro trial on registration. After trial, free tier applies.

### Free tier limits
| Resource | Free | Pro |
|---|---|---|
| Child profiles | 1 | Unlimited |
| Recipes | 10 | Unlimited |
| AI features | ✗ | ✅ |
| Friends / social | ✅ | ✅ |

Existing users (created before Phase 15 goes live) receive a permanent Pro flag
(`is_legacy_pro = true` in `profiles`).

### DB
- Extend `profiles`:
  ```sql
  stripe_customer_id   text
  stripe_subscription_id text
  subscription_status  text  -- 'trialing' | 'active' | 'past_due' | 'canceled' | null
  trial_ends_at        timestamptz
  is_legacy_pro        boolean default false
  ```
- Migration: `008_subscriptions.sql`

### Stripe setup
- Products: `Kid Meal Planner Pro` — one recurring price (monthly).
- Webhook events to handle:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

### Edge Functions
- `supabase/functions/create-checkout/index.ts`
  Creates a Stripe Checkout session, returns URL.
- `supabase/functions/stripe-webhook/index.ts`
  Verifies Stripe signature, updates `profiles` on subscription change.
- `supabase/functions/create-portal/index.ts`
  Creates a Stripe Billing Portal session so users can manage / cancel.

### Store
- `src/stores/subscription.store.ts`
  - `status`, `trialEndsAt`, `isPro` (computed — true if trialing/active/legacy)
  - `startCheckout()`, `openPortal()`

### Components / Views
- `src/components/common/UpgradePrompt.vue`
  Reusable card shown when a Pro feature is blocked.
- `src/views/SubscriptionView.vue`
  - Shows current plan, trial countdown, or "Upgrade to Pro" CTA.
  - "Manage subscription" button → Stripe portal.
- Add "Subscription" link to Settings view.

### Enforcement
- `recipe.store.ts` → `create()` throws if free user has ≥ 10 recipes.
- `child.store.ts` → `create()` throws if free user has ≥ 1 child.
- AI composables already gated (Phase 14).

### Trial start
- On registration (`auth.store.ts` → `register()`), call `create-checkout` with
  `trial_period_days: 14` so Stripe records the trial start.
- `trial_ends_at` written to `profiles` by the webhook.

### Done when
- [ ] `profiles` has Stripe + subscription columns
- [ ] New user registration triggers 14-day trial
- [ ] `isPro` computed correctly from `subscription_status` / `is_legacy_pro`
- [ ] Free users hit recipe and child limits with a clear upgrade prompt
- [ ] Stripe Checkout opens and completes (test mode)
- [ ] Webhook updates `profiles.subscription_status` on payment events
- [ ] Billing Portal opens from SettingsView
- [ ] Typecheck passes clean

---

