-- Kid Meal Planner — Phase 15: Subscriptions & Usage Counters

-- a) Add subscription columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT CHECK (subscription_tier IN ('basic','pro')) DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS tier_expires_at   TIMESTAMPTZ DEFAULT NULL;

-- b) Create ai_usage table
CREATE TABLE IF NOT EXISTS ai_usage (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users NOT NULL,
  period_start     DATE NOT NULL,  -- always first day of the month: DATE_TRUNC('month', now())
  generation_count INT  NOT NULL DEFAULT 0,
  UNIQUE (user_id, period_start)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- c) RLS on ai_usage

-- Users can read their own usage rows
CREATE POLICY "ai_usage select own"
  ON ai_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own usage rows
CREATE POLICY "ai_usage insert own"
  ON ai_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own usage rows
CREATE POLICY "ai_usage update own"
  ON ai_usage FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all usage rows
CREATE POLICY "ai_usage select admin"
  ON ai_usage FOR SELECT
  TO authenticated
  USING (is_admin());

-- d) RPC set_user_tier — admin only, SECURITY DEFINER
CREATE OR REPLACE FUNCTION set_user_tier(
  target_user_id UUID,
  new_tier       TEXT,
  new_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE profiles
     SET subscription_tier = new_tier,
         tier_expires_at   = new_expires_at
   WHERE id = target_user_id;
END;
$$;

-- e) No new SELECT policy needed on profiles — existing "profiles select authenticated"
--    (USING true) already covers all columns including the new tier fields.

-- f) Extend get_admin_user_stats() to include subscription_tier and tier_expires_at
-- Must drop first — Postgres cannot change return type via CREATE OR REPLACE
DROP FUNCTION IF EXISTS get_admin_user_stats();

CREATE FUNCTION get_admin_user_stats()
RETURNS TABLE (
  id                uuid,
  display_name      text,
  email             text,
  role              text,
  avatar_url        text,
  created_at        timestamptz,
  recipe_count      bigint,
  plan_count        bigint,
  last_login        timestamptz,
  subscription_tier text,
  tier_expires_at   timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.email,
    p.role,
    p.avatar_url,
    p.created_at,
    COUNT(DISTINCT r.id)::bigint,
    COUNT(DISTINCT wp.id)::bigint,
    MAX(ae.created_at) FILTER (WHERE ae.event = 'login'),
    p.subscription_tier,
    p.tier_expires_at
  FROM profiles p
  LEFT JOIN recipes r           ON r.user_id  = p.id
  LEFT JOIN week_plans wp       ON wp.user_id = p.id
  LEFT JOIN activity_events ae  ON ae.user_id = p.id
  GROUP BY p.id, p.display_name, p.email, p.role, p.avatar_url, p.created_at,
           p.subscription_tier, p.tier_expires_at
  ORDER BY p.created_at DESC;
END;
$$;
