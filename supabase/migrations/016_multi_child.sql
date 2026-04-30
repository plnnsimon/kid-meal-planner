-- Phase 21: Multi-child support
-- Adds child_id FK to week_plans, backfills, updates unique constraint + RLS

-- ─── Add child_id column (nullable so existing rows are not broken) ───────────

ALTER TABLE week_plans
  ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE;

-- ─── Backfill: assign each plan to the user's earliest child by created_at ────

UPDATE week_plans wp
SET child_id = (
  SELECT id FROM child_profiles cp
  WHERE cp.user_id::text = wp.user_id::text
  ORDER BY cp.created_at ASC
  LIMIT 1
);

-- ─── Drop old unique constraint ───────────────────────────────────────────────

ALTER TABLE week_plans DROP CONSTRAINT IF EXISTS week_plans_user_id_week_start_date_key;

-- ─── New unique: one plan per child per week ──────────────────────────────────

ALTER TABLE week_plans ADD CONSTRAINT week_plans_child_week_unique
  UNIQUE (child_id, week_start_date);

-- ─── Fast child listing ───────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_child_profiles_user_id ON child_profiles(user_id);

-- ─── Update RLS policies on week_plans ───────────────────────────────────────

DROP POLICY IF EXISTS "Users can insert own week plans" ON week_plans;
CREATE POLICY "Users can insert own week plans" ON week_plans
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update own week plans" ON week_plans;
CREATE POLICY "Users can update own week plans" ON week_plans
  FOR UPDATE USING (auth.uid()::text = user_id::text);
