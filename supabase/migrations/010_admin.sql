-- Kid Meal Planner — Phase 13: Admin Panel

-- a) Add role and email columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role  TEXT CHECK (role IN ('user', 'admin')) DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- b) Update handle_new_user() to also copy email
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- c) Create activity_events table
CREATE TABLE IF NOT EXISTS activity_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users NOT NULL,
  event      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

-- d) Create is_admin() helper function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- e) RLS policies

-- activity_events: admins can read all
CREATE POLICY "activity_events select admin"
  ON activity_events FOR SELECT
  TO authenticated
  USING (is_admin());

-- activity_events: users insert their own
CREATE POLICY "activity_events insert own"
  ON activity_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- profiles: admins can update any row (separate from existing "update own" policy)
CREATE POLICY "profiles update admin"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- f) get_admin_user_stats() — SECURITY DEFINER, admins only
CREATE OR REPLACE FUNCTION get_admin_user_stats()
RETURNS TABLE (
  id           uuid,
  display_name text,
  email        text,
  role         text,
  avatar_url   text,
  created_at   timestamptz,
  recipe_count bigint,
  plan_count   bigint,
  last_login   timestamptz
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
    MAX(ae.created_at) FILTER (WHERE ae.event = 'login')
  FROM profiles p
  LEFT JOIN recipes r        ON r.user_id  = p.id
  LEFT JOIN week_plans wp    ON wp.user_id = p.id
  LEFT JOIN activity_events ae ON ae.user_id = p.id
  GROUP BY p.id, p.display_name, p.email, p.role, p.avatar_url, p.created_at
  ORDER BY p.created_at DESC;
END;
$$;
