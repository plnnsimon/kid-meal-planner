-- Kid Meal Planner — Phase 7: Auth activation
-- Truncates existing data (local-user TEXT ids cannot be preserved),
-- alters user_id columns to UUID with FK to auth.users,
-- enables RLS and creates read + insert policies.

-- ─── 1. Truncate all tables (cascade handles FK order) ───────────────────────

TRUNCATE TABLE meal_slots CASCADE;
TRUNCATE TABLE week_plans  CASCADE;
TRUNCATE TABLE recipes     CASCADE;
TRUNCATE TABLE child_profiles CASCADE;

-- ─── 2. Alter user_id columns: TEXT → UUID + FK to auth.users ────────────────

ALTER TABLE child_profiles
  ALTER COLUMN user_id TYPE UUID USING user_id::UUID,
  ADD CONSTRAINT child_profiles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE recipes
  ALTER COLUMN user_id TYPE UUID USING user_id::UUID,
  ADD CONSTRAINT recipes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE week_plans
  ALTER COLUMN user_id TYPE UUID USING user_id::UUID,
  ADD CONSTRAINT week_plans_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ─── 3. Enable Row Level Security ────────────────────────────────────────────

ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE week_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_slots      ENABLE ROW LEVEL SECURITY;

-- ─── 4. SELECT policies ──────────────────────────────────────────────────────

CREATE POLICY "select own child_profiles"
  ON child_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "select own recipes"
  ON recipes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "select own week_plans"
  ON week_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "select own meal_slots"
  ON meal_slots FOR SELECT
  USING (
    week_plan_id IN (SELECT id FROM week_plans WHERE user_id = auth.uid())
  );

-- ─── 5. INSERT policies ──────────────────────────────────────────────────────

CREATE POLICY "insert own child_profiles"
  ON child_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "insert own recipes"
  ON recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "insert own week_plans"
  ON week_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "insert own meal_slots"
  ON meal_slots FOR INSERT
  WITH CHECK (
    week_plan_id IN (SELECT id FROM week_plans WHERE user_id = auth.uid())
  );

-- ─── 6. UPDATE policies ──────────────────────────────────────────────────────

CREATE POLICY "update own child_profiles"
  ON child_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update own recipes"
  ON recipes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update own week_plans"
  ON week_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update own meal_slots"
  ON meal_slots FOR UPDATE
  USING (
    week_plan_id IN (SELECT id FROM week_plans WHERE user_id = auth.uid())
  );

-- ─── 7. DELETE policies ──────────────────────────────────────────────────────

CREATE POLICY "delete own child_profiles"
  ON child_profiles FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "delete own recipes"
  ON recipes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "delete own week_plans"
  ON week_plans FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "delete own meal_slots"
  ON meal_slots FOR DELETE
  USING (
    week_plan_id IN (SELECT id FROM week_plans WHERE user_id = auth.uid())
  );
