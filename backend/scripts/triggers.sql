-- =============================================================
-- triggers.sql
-- Supabase PostgreSQL trigger functions for PediaMom
-- =============================================================

-- Function: handle_new_user
-- Called after every INSERT on auth.users.
-- Inserts a corresponding profile row into public.users with
-- role defaulting to 'parent' and 50 free credits.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, credits, created_at)
  VALUES (NEW.id, NEW.email, 'parent', 50, NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: on_auth_user_created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
