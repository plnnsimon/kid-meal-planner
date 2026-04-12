-- Kid Meal Planner — initial schema
-- Run this in your Supabase project: Dashboard → SQL Editor → New query

-- ─── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS child_profiles (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              TEXT        NOT NULL,  -- TEXT for now; change to UUID REFERENCES auth.users when auth is enabled
  name                 TEXT        NOT NULL,
  birth_date           DATE,
  avatar_url           TEXT,
  allergies            TEXT[]      DEFAULT '{}',
  dietary_restrictions TEXT[]      DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT        NOT NULL,
  name         TEXT        NOT NULL,
  description  TEXT        DEFAULT '',
  image_url    TEXT,
  meal_types   TEXT[]      DEFAULT '{}',
  prep_time    INT         DEFAULT 0,
  cook_time    INT         DEFAULT 0,
  servings     INT         DEFAULT 1,
  nutrition    JSONB       DEFAULT '{"calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0}',
  ingredients  JSONB       DEFAULT '[]',
  instructions TEXT[]      DEFAULT '{}',
  allergens    TEXT[]      DEFAULT '{}',
  tags         TEXT[]      DEFAULT '{}',
  is_favorite  BOOLEAN     DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS week_plans (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT        NOT NULL,
  week_start_date  DATE        NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start_date)
);

CREATE TABLE IF NOT EXISTS meal_slots (
  id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  week_plan_id UUID  NOT NULL REFERENCES week_plans ON DELETE CASCADE,
  day_of_week  INT   NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  meal_type    TEXT  NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  recipe_id    UUID  REFERENCES recipes ON DELETE SET NULL,
  servings     INT   DEFAULT 1,
  notes        TEXT  DEFAULT ''
);

-- ─── Updated-at trigger for recipes ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Row Level Security (DISABLED for single-user mode) ──────────────────────
-- Uncomment and adjust when auth is enabled.
--
-- ALTER TABLE child_profiles  ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE recipes          ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE week_plans       ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE meal_slots       ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "own data" ON child_profiles  USING (auth.uid()::text = user_id);
-- CREATE POLICY "own data" ON recipes          USING (auth.uid()::text = user_id);
-- CREATE POLICY "own data" ON week_plans       USING (auth.uid()::text = user_id);
-- CREATE POLICY "own data" ON meal_slots USING (
--   week_plan_id IN (SELECT id FROM week_plans WHERE user_id = auth.uid()::text)
-- );

-- ─── Storage bucket for recipe images ────────────────────────────────────────
-- Run separately in Supabase Dashboard → Storage → New bucket
--   Name: recipe-images
--   Public: true
