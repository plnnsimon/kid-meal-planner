ALTER TABLE child_profiles
  ADD COLUMN IF NOT EXISTS tasted_ingredients TEXT[] DEFAULT '{}';
