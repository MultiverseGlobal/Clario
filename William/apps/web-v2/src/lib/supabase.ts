import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://imguadokkmkckvukkmjg.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZ3VhZG9ra21rY2t2dWtrbWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0Njg2NzMsImV4cCI6MjEwMDA0NDY3M30.i6hCSre2R7xoQKI-E1khteYppTAqc_J3NzmdgGetGz8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});
