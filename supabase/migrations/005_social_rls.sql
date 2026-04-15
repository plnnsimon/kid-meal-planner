-- 005_social_rls.sql

-- ── recipe_favorites ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recipe_favorites (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id  UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, recipe_id)
);
ALTER TABLE recipe_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipe_favorites_select" ON recipe_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "recipe_favorites_insert" ON recipe_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recipe_favorites_delete" ON recipe_favorites FOR DELETE USING (auth.uid() = user_id);

-- ── Helper: are_friends ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION are_friends(a UUID, b UUID) RETURNS BOOLEAN
  LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
        AND ((requester_id = a AND addressee_id = b)
          OR (requester_id = b AND addressee_id = a))
    );
  $$;

-- ── recipes RLS ──────────────────────────────────────────────────────────────

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "recipes_select" ON recipes;
  DROP POLICY IF EXISTS "recipes_insert" ON recipes;
  DROP POLICY IF EXISTS "recipes_update" ON recipes;
  DROP POLICY IF EXISTS "recipes_delete" ON recipes;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "recipes_select" ON recipes FOR SELECT TO authenticated USING (true);
CREATE POLICY "recipes_insert" ON recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recipes_update" ON recipes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recipes_delete" ON recipes FOR DELETE USING (auth.uid() = user_id);

-- ── child_profiles RLS ───────────────────────────────────────────────────────

ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "child_profiles_select" ON child_profiles;
  DROP POLICY IF EXISTS "child_profiles_insert" ON child_profiles;
  DROP POLICY IF EXISTS "child_profiles_update" ON child_profiles;
  DROP POLICY IF EXISTS "child_profiles_delete" ON child_profiles;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "child_profiles_select" ON child_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR are_friends(auth.uid(), user_id));
CREATE POLICY "child_profiles_insert" ON child_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "child_profiles_update" ON child_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "child_profiles_delete" ON child_profiles FOR DELETE USING (auth.uid() = user_id);

-- ── week_plans RLS ───────────────────────────────────────────────────────────

ALTER TABLE week_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "week_plans_select" ON week_plans;
  DROP POLICY IF EXISTS "week_plans_insert" ON week_plans;
  DROP POLICY IF EXISTS "week_plans_update" ON week_plans;
  DROP POLICY IF EXISTS "week_plans_delete" ON week_plans;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "week_plans_select" ON week_plans FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR are_friends(auth.uid(), user_id));
CREATE POLICY "week_plans_insert" ON week_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "week_plans_update" ON week_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "week_plans_delete" ON week_plans FOR DELETE USING (auth.uid() = user_id);

-- ── meal_slots RLS ───────────────────────────────────────────────────────────

ALTER TABLE meal_slots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "meal_slots_select" ON meal_slots;
  DROP POLICY IF EXISTS "meal_slots_insert" ON meal_slots;
  DROP POLICY IF EXISTS "meal_slots_update" ON meal_slots;
  DROP POLICY IF EXISTS "meal_slots_delete" ON meal_slots;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "meal_slots_select" ON meal_slots FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM week_plans wp
    WHERE wp.id = meal_slots.week_plan_id
      AND (wp.user_id = auth.uid() OR are_friends(auth.uid(), wp.user_id))
  ));
CREATE POLICY "meal_slots_insert" ON meal_slots FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM week_plans WHERE id = week_plan_id AND user_id = auth.uid()));
CREATE POLICY "meal_slots_update" ON meal_slots FOR UPDATE
  USING (EXISTS (SELECT 1 FROM week_plans WHERE id = week_plan_id AND user_id = auth.uid()));
CREATE POLICY "meal_slots_delete" ON meal_slots FOR DELETE
  USING (EXISTS (SELECT 1 FROM week_plans WHERE id = week_plan_id AND user_id = auth.uid()));
