import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : '') ||
  '';
const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : '') ||
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project-id') &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('your-anon-key') &&
    !supabaseAnonKey.includes('unconfigured')
);

// Fallback dummy URL only to prevent createClient from crashing during module import when unconfigured
const targetUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const targetKey = isSupabaseConfigured ? supabaseAnonKey : 'dummy-anon-key';

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
