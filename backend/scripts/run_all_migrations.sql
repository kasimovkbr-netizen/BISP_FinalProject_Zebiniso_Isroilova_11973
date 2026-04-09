-- ============================================================
-- PediaMom — Run this entire script in Supabase SQL Editor
-- Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- 1. Stripe + Credits columns on users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS credits                 INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS free_credits_used       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id  TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status     TEXT,
  ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;

-- Give existing users 50 credits if they have 0
UPDATE users SET credits = 50 WHERE credits = 0;

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);

-- 2. AI result columns on medical_analyses
ALTER TABLE medical_analyses
  ADD COLUMN IF NOT EXISTS ai_result      JSONB,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;

-- 3. Period tracker columns on mother_health
ALTER TABLE mother_health
  ADD COLUMN IF NOT EXISTS period_end_date  DATE,
  ADD COLUMN IF NOT EXISTS flow_level       TEXT,
  ADD COLUMN IF NOT EXISTS period_duration  INTEGER;

-- 4. Cycle history table
CREATE TABLE IF NOT EXISTS cycle_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  period_start  DATE NOT NULL,
  period_end    DATE,
  flow_level    TEXT,
  cycle_length  INTEGER,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_cycle_history_user
  ON cycle_history(user_id, period_start DESC);

ALTER TABLE cycle_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own cycles" ON cycle_history;
CREATE POLICY "Users manage own cycles" ON cycle_history
  FOR ALL USING (auth.uid() = user_id);

-- ─── Admin foydalanuvchi qo'shish ─────────────────────────────────────────────
-- O'z email ingizni kiriting:
-- UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
