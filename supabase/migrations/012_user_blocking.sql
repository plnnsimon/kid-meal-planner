-- Kid Meal Planner — Phase: User Blocking

-- a) Add is_blocked column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;

-- b) Admin function to block/unblock a user
CREATE OR REPLACE FUNCTION set_user_blocked(target_user_id UUID, blocked BOOLEAN)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE profiles SET is_blocked = blocked WHERE id = target_user_id;
END;
$$;

-- c) Drop and recreate get_admin_user_stats() with is_blocked in return type
DROP FUNCTION IF EXISTS get_admin_user_stats();

CREATE OR REPLACE FUNCTION get_admin_user_stats()
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
  tier_expires_at   timestamptz,
  is_blocked        boolean
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
    p.tier_expires_at,
    p.is_blocked
  FROM profiles p
  LEFT JOIN recipes r           ON r.user_id  = p.id
  LEFT JOIN week_plans wp       ON wp.user_id = p.id
  LEFT JOIN activity_events ae  ON ae.user_id = p.id
  GROUP BY p.id, p.display_name, p.email, p.role, p.avatar_url, p.created_at,
           p.subscription_tier, p.tier_expires_at, p.is_blocked
  ORDER BY p.created_at DESC;
END;
$$;
