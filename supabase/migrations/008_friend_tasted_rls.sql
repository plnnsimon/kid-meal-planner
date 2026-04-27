-- 008_friend_tasted_rls.sql
-- Replace the FOR ALL policy with separate SELECT / INSERT / DELETE policies
-- so friends can read but not modify each other's tasted ingredients.

-- Drop the FOR ALL policy created in 007
DROP POLICY IF EXISTS "tasted_all_own" ON child_tasted_ingredients;

-- Own OR friend can SELECT
CREATE POLICY "tasted_select_own_or_friend" ON child_tasted_ingredients FOR SELECT TO authenticated
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles
      WHERE user_id::uuid = auth.uid()
         OR are_friends(auth.uid(), user_id::uuid)
    )
  );

-- Only own child INSERT
CREATE POLICY "tasted_insert_own" ON child_tasted_ingredients FOR INSERT TO authenticated
  WITH CHECK (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE user_id::uuid = auth.uid()
    )
  );

-- Only own child DELETE
CREATE POLICY "tasted_delete_own" ON child_tasted_ingredients FOR DELETE TO authenticated
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE user_id::uuid = auth.uid()
    )
  );
