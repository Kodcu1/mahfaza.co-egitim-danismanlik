import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : '') || '';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : '') || '';

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

export const supabase: SupabaseClient = createClient(
  targetUrl,
  targetKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
