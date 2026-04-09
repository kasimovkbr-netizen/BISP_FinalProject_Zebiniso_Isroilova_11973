-- =============================================================================
-- Migration: Add credits column to users table
-- Run this in Supabase SQL Editor
-- =============================================================================

-- 1. Add credits column with default 50 free credits for new users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 50;

-- 2. Give existing users 50 credits if they have 0 or null
UPDATE public.users
  SET credits = 50
  WHERE credits IS NULL OR credits = 0;

-- 3. Update trigger to include credits on new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, credits, created_at)
  VALUES (NEW.id, NEW.email, 'parent', 50, NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
