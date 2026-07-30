// Run ALTER TABLE to add display_area column
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wwkrpbxtvkaxfbewhdor.supabase.co';
const SERVICE_KEY = process.argv[2]; // pass service_role key

if (!SERVICE_KEY) {
    // Try via anon key + rpc if available, otherwise use fetch to management API
    console.error('Usage: node alter_table.mjs <password>');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3a3JwYnh0dmtheGZiZXdoZG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTgzNTQsImV4cCI6MjEwMDc3NDM1NH0.YwbHnNsMEvqDtPD7nJQ0nWlyCbiSgEOO6XQRrNdQvug');

const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'haitrinhnt@gmail.com', password: SERVICE_KEY
});
if (authError) { console.error('Login fail:', authError.message); process.exit(1); }
console.log('Logged in OK');

// Try rpc exec_sql if available
const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE specimens ADD COLUMN IF NOT EXISTS display_area TEXT;'
});

if (error) {
    console.log('rpc exec_sql not available:', error.message);
    console.log('\nNeed to run this SQL manually in Supabase Dashboard SQL Editor:');
    console.log('ALTER TABLE specimens ADD COLUMN IF NOT EXISTS display_area TEXT;');
} else {
    console.log('Column added successfully!', data);
}
