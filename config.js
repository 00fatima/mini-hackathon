// config.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://ghvddidabkzmekdwwtns.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sTnu_0-FzFcl534s7ue8DA_tP6f3azV';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);