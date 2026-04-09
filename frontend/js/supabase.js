// Import Supabase JS v2 from CDN
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const url = window.__SUPABASE_URL__;
const key = window.__SUPABASE_ANON_KEY__;

if (!url) {
  throw new Error(
    "[supabase.js] SUPABASE_URL is required but was not found on window.__SUPABASE_URL__",
  );
}
if (!key) {
  throw new Error(
    "[supabase.js] SUPABASE_ANON_KEY is required but was not found on window.__SUPABASE_ANON_KEY__",
  );
}

export const supabase = createClient(url, key);
