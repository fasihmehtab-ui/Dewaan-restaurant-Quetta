import { createClient } from '@supabase/supabase-js';

const SUPABASE_PROJECT_ID = 'khbmtvotbiztxadqhnaw';
const DEFAULT_SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
const DEFAULT_SUPABASE_KEY = 'sb_publishable_uW3hpaq6C_3_eD4V5Ow1Lw_U49BirtG';

export const supabaseUrl = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL;

export const supabaseKey = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const SUPABASE_CONFIG = {
  projectId: SUPABASE_PROJECT_ID,
  url: supabaseUrl,
  connected: true,
};
