/**
 * Supabase Admin client configuration for backend services.
 * Uses service_role key to bypass RLS for server-side operations.
 */

const { createClient } = require("@supabase/supabase-js");

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL) {
  throw new Error(
    "[supabase.js] SUPABASE_URL is required but was not set in environment variables",
  );
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "[supabase.js] SUPABASE_SERVICE_ROLE_KEY is required but was not set in environment variables",
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

module.exports = { supabase };
