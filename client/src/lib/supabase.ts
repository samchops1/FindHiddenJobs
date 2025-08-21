import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase config:', { 
  url: supabaseUrl ? 'present' : 'missing', 
  key: supabaseAnonKey ? 'present' : 'missing' 
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Get the current site URL for redirects
const getSiteUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:5000'; // fallback for SSR
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    redirectTo: getSiteUrl(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});