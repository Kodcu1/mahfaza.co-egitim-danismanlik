import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : '') ||
  '';
const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : '') ||
  '';

const targetUrl = supabaseUrl || 'https://lljzumduvnzenydiopnc.supabase.co';
const targetKey = supabaseAnonKey || 'sb_publishable_vVNBi3PqvKVaHLSQ7d_zZQ_78l_mBGx';

export const isSupabaseConfigured = Boolean(
  targetUrl &&
    targetKey &&
    !targetUrl.includes('your-project-id') &&
    !targetUrl.includes('placeholder-project') &&
    !targetKey.includes('your-anon-key') &&
    !targetKey.includes('unconfigured')
);

/**
 * Custom fetch interceptor to prevent HTTP 400 "Request Header Or Cookie Too Large"
 * when an account's JWT contains a bloated user_metadata payload (e.g., base64 avatar_url).
 */
const safeSupabaseFetch: typeof fetch = async (input, init) => {
  if (init?.headers) {
    const headers = new Headers(init.headers);
    const authHeader = headers.get('Authorization') || headers.get('authorization');
    if (authHeader && authHeader.length > 7500) {
      headers.set('Authorization', `Bearer ${targetKey}`);
      return fetch(input, { ...init, headers });
    }
  }
  return fetch(input, init);
};

export const supabase: SupabaseClient = createClient(targetUrl, targetKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: safeSupabaseFetch,
  },
});
