// ============================================================
// Supabase Client Configuration
// ============================================================
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wwkrpbxtvkaxfbewhdor.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_ANON_KEY) {
  console.warn(
    '⚠️ VITE_SUPABASE_ANON_KEY chưa được cấu hình.\n' +
    'Tạo file .env với nội dung:\n' +
    'VITE_SUPABASE_ANON_KEY=your_anon_key_here'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export { SUPABASE_URL };
