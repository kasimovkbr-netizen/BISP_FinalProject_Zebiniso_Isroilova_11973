-- Add Stripe payment columns to users table
-- Run this in Supabase SQL Editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS credits               INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_credits_used     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_customer_id    TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status   TEXT,       -- 'active' | 'cancelling' | null
  ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;

-- Index for webhook lookups by stripe_customer_id
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);

-- Add AI result columns to medical_analyses
ALTER TABLE medical_analyses
  ADD COLUMN IF NOT EXISTS ai_result      JSONB,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;
