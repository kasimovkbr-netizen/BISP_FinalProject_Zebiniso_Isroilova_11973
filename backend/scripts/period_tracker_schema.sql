-- Period Tracker Schema Update
-- Run in Supabase SQL Editor

-- Add new columns to mother_health for full period tracking
ALTER TABLE mother_health
  ADD COLUMN IF NOT EXISTS period_end_date   DATE,
  ADD COLUMN IF NOT EXISTS flow_level        TEXT,        -- 'light' | 'medium' | 'heavy'
  ADD COLUMN IF NOT EXISTS period_duration   INTEGER;     -- days

-- Cycle history table — one row per cycle
CREATE TABLE IF NOT EXISTS cycle_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  period_start     DATE NOT NULL,
  period_end       DATE,
  flow_level       TEXT,
  cycle_length     INTEGER,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_cycle_history_user ON cycle_history(user_id, period_start DESC);

-- RLS
ALTER TABLE cycle_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cycles" ON cycle_history
  FOR ALL USING (auth.uid() = user_id);
