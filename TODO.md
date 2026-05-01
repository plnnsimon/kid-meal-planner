# Scaling Roadmap — Kid Meal Planner

Each phase is a single Agent call.  
Run `npx vue-tsc --noEmit` before marking any phase done.


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

