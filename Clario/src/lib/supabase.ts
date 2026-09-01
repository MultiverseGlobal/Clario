import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://dummy-url.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "dummy-key";

// Use anon key for public realtime listening/broadcasting
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
