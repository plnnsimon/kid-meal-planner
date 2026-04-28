# Scaling Roadmap — Kid Meal Planner

Phases 12–15. Each phase is a single Agent call.  
Run `npx vue-tsc --noEmit` before marking any phase done.

---

## Phase 12 — Feedback System

**Goal:** Users can submit bug reports and feature requests from anywhere in the app.
Submissions land in a Supabase table and are visible in the future admin panel.

### DB
- New table `feedback`:
  ```sql
  id uuid primary key default gen_random_uuid()
  user_id uuid references auth.users not null
  type text check (type in ('bug', 'feature')) not null
  message text not null
  created_at timestamptz default now()
  ```
- RLS: users can insert their own rows; service role can read all.

### Store
- `src/stores/feedback.store.ts` — `submit(type, message): Promise<void>`

### Components
- `src/components/common/FeedbackButton.vue`  
  Floating button (bottom-right, above BottomNav).  
  Opens `FeedbackModal.vue`.
- `src/components/common/FeedbackModal.vue`  
  Bottom sheet: radio (Bug / Feature request) + textarea + Submit.  
  Shows success toast on submit.

### Wiring
- Mount `<FeedbackButton />` in `App.vue` (hidden on `/login`).

### Done when
- [ ] `feedback` table exists in migration `006_feedback.sql`
- [ ] User can open modal, fill form, submit — row appears in Supabase
- [ ] Button is hidden on the login screen
- [ ] Typecheck passes clean

---

## Phase 13 — Admin Panel

**Goal:** A protected `/admin` section showing registered users, their roles, and
lightweight activity (last login, recipe count, plan count).

### DB
- Add `role text check (role in ('user','admin')) default 'user'` to `profiles`.
- New table `activity_events`:
  ```sql
  id uuid primary key default gen_random_uuid()
  user_id uuid references auth.users not null
  event text not null   -- 'login' | 'recipe_created' | 'plan_saved'
  created_at timestamptz default now()
  ```
- RLS: only service role / admin can read `activity_events`.
- Migration: `007_admin.sql`

### Event tracking
- Fire `activity_events` inserts (non-blocking, fire-and-forget) in:
  - `auth.store.ts` → after successful login: `event = 'login'`
  - `recipe.store.ts` → after create: `event = 'recipe_created'`
  - `weekPlan.store.ts` → after save: `event = 'plan_saved'`

### Route guard
- `router/index.ts` — add `requiresAdmin` meta; redirect non-admins to `/`.

### Store
- `src/stores/admin.store.ts`
  - `users: AdminUser[]` — joined `profiles` + event counts + last login
  - `feedback: Feedback[]` — all feedback rows (reuses Phase 12 table)
  - `load()`, `setRole(userId, role)`

### Views / Components
- `src/views/admin/AdminLayout.vue` — sidebar nav (Users | Feedback)
- `src/views/admin/AdminUsersView.vue`
  - Table: avatar, display name, email, role, recipes, plans, last login
  - Inline role toggle (user ↔ admin) — calls `setRole`
- `src/views/admin/AdminFeedbackView.vue`
  - List of feedback rows: type badge, message, user name, date

### BottomNav
- Do **not** show BottomNav on `/admin/*` routes.

### Done when
- [ ] `profiles.role` column exists
- [ ] `activity_events` table exists and receives events
- [ ] `/admin` redirects non-admins
- [ ] Admin can see user list with activity counts
- [ ] Admin can see all feedback submissions
- [ ] Typecheck passes clean

---

[//]: # (## Phase 14 — AI Integration)

[//]: # ()
[//]: # (Two features using the Anthropic Claude API &#40;`claude-sonnet-4-6`&#41;.)

[//]: # ()
[//]: # (### Feature A — Recipe Generator)

[//]: # (User provides a list of ingredients → AI returns a structured recipe)

[//]: # (&#40;name, ingredients with amounts, steps, estimated kcal + macros&#41;.)

[//]: # ()
[//]: # (**Entry point:** FAB on `RecipeLibraryView.vue` gets a second option  )

[//]: # ("Generate with AI" &#40;opens `RecipeGeneratorModal.vue`&#41;.)

[//]: # ()
[//]: # (**Flow:**)

[//]: # (1. User types ingredients &#40;comma-separated or one per line&#41;.)

[//]: # (2. POST to a Supabase Edge Function `generate-recipe`.)

[//]: # (3. Edge Function calls Anthropic API with a structured prompt.)

[//]: # (4. Returns JSON matching `RecipePayload` type.)

[//]: # (5. Modal pre-fills `RecipeForm` with the result — user reviews + saves.)

[//]: # ()
[//]: # (### Feature B — Weekly Nutrition Analysis)

[//]: # (After the week plan is loaded, a "Analyse week" button in `WeekPlanView.vue`)

[//]: # (calls an Edge Function `analyse-week`.)

[//]: # ()
[//]: # (**Flow:**)

[//]: # (1. Client sends array of meal slots with recipe names + macros.)

[//]: # (2. Edge Function calls Claude — asks for a short &#40;3–5 sentence&#41; nutritional)

[//]: # (   summary and any flags &#40;e.g. low iron, too much sugar&#41;.)

[//]: # (3. Result displayed in a bottom sheet `NutritionAnalysisModal.vue`.)

[//]: # ()
[//]: # (### Edge Functions)

[//]: # (- `supabase/functions/generate-recipe/index.ts`)

[//]: # (- `supabase/functions/analyse-week/index.ts`)

[//]: # (- Both use `ANTHROPIC_API_KEY` env var &#40;set in Supabase dashboard&#41;.)

[//]: # (- Both validate that the caller is authenticated &#40;check JWT&#41;.)

[//]: # ()
[//]: # (### Store / composables)

[//]: # (- `src/composables/useAI.ts` — `generateRecipe&#40;ingredients&#41;`, `analyseWeek&#40;slots&#41;`)

[//]: # (  Wraps `supabase.functions.invoke&#40;...&#41;`.)

[//]: # ()
[//]: # (### AI gate &#40;Pro only — Phase 15 prerequisite&#41;)

[//]: # (- Both AI features check `subscriptionStore.isPro` before calling.)

[//]: # (- If not Pro, show upgrade prompt instead.)

[//]: # ()
[//]: # (### Done when)

[//]: # (- [ ] `generate-recipe` edge function returns valid `RecipePayload` JSON)

[//]: # (- [ ] `analyse-week` edge function returns a text summary)

[//]: # (- [ ] RecipeGeneratorModal pre-fills RecipeForm correctly)

[//]: # (- [ ] NutritionAnalysisModal displays summary)

[//]: # (- [ ] Both features blocked for free users &#40;show upgrade prompt&#41;)

[//]: # (- [ ] Typecheck passes clean)

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

## Execution order

```
Phase 12 → Phase 13 → Phase 14 → Phase 15
```

Phase 14 depends on Phase 15 only for the Pro gate — the AI itself can be built
first and gated in a follow-up pass once Stripe is wired.

## Open decisions (resolve before starting each phase)

| Phase | Decision needed |
|---|---|
| 13 | Who gets the first admin role? (set manually in Supabase dashboard) |
| 14 | `ANTHROPIC_API_KEY` — add to Supabase project secrets before deploying functions |
| 15 | Stripe account, product ID, and price ID — needed before Edge Functions are coded |
| 15 | Monthly price point |
| 15 | Which existing users get `is_legacy_pro = true`? |
