-- 004_friendships.sql
CREATE TABLE IF NOT EXISTS friendships (
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (requester_id, addressee_id)
);

-- Indexes for fast look-ups from either side
CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON friendships (addressee_id);

-- Enable Row Level Security
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- SELECT: both requester and addressee can read their own rows
CREATE POLICY "friendships_select" ON friendships
  FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- INSERT: only the requester can insert (and must be inserting as themselves)
CREATE POLICY "friendships_insert" ON friendships
  FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- UPDATE: only the addressee can update (to accept)
CREATE POLICY "friendships_update" ON friendships
  FOR UPDATE
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id);

-- DELETE: either party can remove the row
CREATE POLICY "friendships_delete" ON friendships
  FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
