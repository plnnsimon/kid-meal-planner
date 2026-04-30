-- Kid Meal Planner — Phase 15: Gamification DB layer

-- ─── A. Add rating columns to recipes ────────────────────────────────────────

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS avg_rating FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ratings_count INT NOT NULL DEFAULT 0;

-- ─── B. recipe_ratings table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recipe_ratings (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id  UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  score      SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, recipe_id)
);

-- ─── C. Trigger to keep avg_rating and ratings_count up to date ───────────────

CREATE OR REPLACE FUNCTION refresh_recipe_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_recipe_id UUID;
BEGIN
  -- Determine which recipe_id changed
  IF TG_OP = 'DELETE' THEN
    v_recipe_id := OLD.recipe_id;
  ELSE
    v_recipe_id := NEW.recipe_id;
  END IF;

  UPDATE recipes
  SET
    avg_rating    = COALESCE(ROUND((SELECT AVG(score)::numeric FROM recipe_ratings WHERE recipe_id = v_recipe_id), 1), 0),
    ratings_count = (SELECT COUNT(*) FROM recipe_ratings WHERE recipe_id = v_recipe_id)
  WHERE id = v_recipe_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS recipe_ratings_refresh ON recipe_ratings;

CREATE TRIGGER recipe_ratings_refresh
  AFTER INSERT OR UPDATE OR DELETE ON recipe_ratings
  FOR EACH ROW EXECUTE FUNCTION refresh_recipe_rating();

-- ─── D. get_leaderboard_for_friends() ────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_leaderboard_for_friends(p_user_id UUID)
RETURNS TABLE (
  user_id        UUID,
  display_name   TEXT,
  avatar_url     TEXT,
  saved_count    BIGINT,
  avg_saved_rating FLOAT,
  score          FLOAT,
  rank           BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH participants AS (
    -- Self
    SELECT p_user_id AS uid
    UNION
    -- Accepted friends
    SELECT CASE
      WHEN requester_id = p_user_id THEN addressee_id
      ELSE requester_id
    END AS uid
    FROM friendships
    WHERE status = 'accepted'
      AND (requester_id = p_user_id OR addressee_id = p_user_id)
  ),
  stats AS (
    SELECT
      pa.uid,
      COUNT(rf.recipe_id)                                         AS saved_count,
      COALESCE(AVG(r.avg_rating) FILTER (WHERE rf.recipe_id IS NOT NULL), 0) AS avg_saved_rating
    FROM participants pa
    LEFT JOIN recipe_favorites rf ON rf.user_id = pa.uid
    LEFT JOIN recipes r ON r.id = rf.recipe_id
    GROUP BY pa.uid
  ),
  ranked AS (
    SELECT
      s.uid,
      p.display_name,
      p.avatar_url,
      s.saved_count,
      s.avg_saved_rating,
      (s.saved_count * 1.0 + s.avg_saved_rating * 10.0) AS score,
      RANK() OVER (ORDER BY (s.saved_count * 1.0 + s.avg_saved_rating * 10.0) DESC) AS rank
    FROM stats s
    JOIN profiles p ON p.id = s.uid
  )
  SELECT
    uid          AS user_id,
    display_name,
    avatar_url,
    saved_count,
    avg_saved_rating,
    score,
    rank
  FROM ranked
  ORDER BY rank ASC;
$$;

-- ─── E. RLS for recipe_ratings ────────────────────────────────────────────────

ALTER TABLE recipe_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipe_ratings_select" ON recipe_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "recipe_ratings_insert" ON recipe_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recipe_ratings_update" ON recipe_ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recipe_ratings_delete" ON recipe_ratings FOR DELETE TO authenticated USING (auth.uid() = user_id);
