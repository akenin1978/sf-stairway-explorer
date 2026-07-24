import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase env vars. Copy .env.example to .env and fill in your ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

// This uses the anon (public) key, which is safe to expose in client-side
// code. Never put your Supabase service_role key here or in any file that
// ships to the browser -- that key must only ever live in the Apps Script
// sync tool, server-side.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
