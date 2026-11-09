import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as any)?.env || {};

// Publishable values: safe to ship to the browser. Every table is protected by
// row level security, so a request only ever sees the signed-in user's rows.
export const SUPABASE_URL: string = metaEnv.VITE_SUPABASE_URL || 'https://ltmgmdbxgpyxcgpymdck.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY: string =
  metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_60sjInaKQj-NDB8CG1Ggwg_rlYEaRSC';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});
