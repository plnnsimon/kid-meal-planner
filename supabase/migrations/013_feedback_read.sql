-- Kid Meal Planner — Phase 15: Feedback read/unread tracking

ALTER TABLE feedback ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;

-- Admins can mark feedback as read
CREATE POLICY "feedback update admin"
  ON feedback FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
