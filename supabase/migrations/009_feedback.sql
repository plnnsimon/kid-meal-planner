-- Kid Meal Planner — Phase 12: Feedback System

CREATE TABLE IF NOT EXISTS feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users NOT NULL,
  type       TEXT CHECK (type IN ('bug', 'feature')) NOT NULL,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own feedback
CREATE POLICY "feedback insert own"
  ON feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all feedback (is_admin() defined in 010 — resolved at runtime)
CREATE POLICY "feedback select admin"
  ON feedback FOR SELECT
  TO authenticated
  USING (is_admin());
