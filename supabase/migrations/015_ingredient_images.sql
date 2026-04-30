-- Kid Meal Planner — Phase 19: Ingredient images

-- ─── 1. Add image_url column to ingredients ───────────────────────────────────
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ─── 2. Admin UPDATE policy on ingredients ────────────────────────────────────
DROP POLICY IF EXISTS "ingredients_update_admin" ON ingredients;

CREATE POLICY "ingredients_update_admin" ON ingredients FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ─── 3. Create ingredient-images storage bucket (public) ─────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('ingredient-images', 'ingredient-images', true)
ON CONFLICT (id) DO NOTHING;

-- ─── 4. Storage RLS: admins can INSERT/UPDATE/DELETE objects ─────────────────
DROP POLICY IF EXISTS "ingredient_images_admin_write" ON storage.objects;

CREATE POLICY "ingredient_images_admin_write" ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'ingredient-images' AND is_admin())
  WITH CHECK (bucket_id = 'ingredient-images' AND is_admin());

-- ─── 5. Storage RLS: all authenticated users can SELECT objects ───────────────
DROP POLICY IF EXISTS "ingredient_images_read" ON storage.objects;

CREATE POLICY "ingredient_images_read" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'ingredient-images');
