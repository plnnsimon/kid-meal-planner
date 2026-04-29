# Scaling Roadmap — Kid Meal Planner

Phases 12–15. Each phase is a single Agent call.  
Run `npx vue-tsc --noEmit` before marking any phase done.

---

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
