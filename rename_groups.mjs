// Rename groups in Supabase: specimens_groups table
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wwkrpbxtvkaxfbewhdor.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3a3JwYnh0dmtheGZiZXdoZG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTgzNTQsImV4cCI6MjEwMDc3NDM1NH0.YwbHnNsMEvqDtPD7nJQ0nWlyCbiSgEOO6XQRrNdQvug';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const password = process.argv[2];
const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'haitrinhnt@gmail.com', password
});
if (authError) { console.error('Login fail:', authError.message); process.exit(1); }
console.log('Logged in OK');

const RENAMES = {
    'Cá': 'Cá biển',
    'Da gai': 'Động vật Da gai',
};

for (const [oldName, newName] of Object.entries(RENAMES)) {
    // Check if new name already exists
    const { data: existing } = await supabase
        .from('specimen_groups')
        .select('id')
        .eq('name', newName)
        .single();

    if (existing) {
        // New name already exists → need to move specimens from old to new, then delete old
        const { data: oldGroup } = await supabase
            .from('specimen_groups')
            .select('id')
            .eq('name', oldName)
            .single();

        if (oldGroup) {
            // Update all specimens pointing to old group → point to new group
            const { error: upErr, count } = await supabase
                .from('specimens')
                .update({ group_id: existing.id })
                .eq('group_id', oldGroup.id);
            if (upErr) { console.error(`  Error moving specimens:`, upErr.message); continue; }
            
            // Delete old group
            const { error: delErr } = await supabase
                .from('specimen_groups')
                .delete()
                .eq('id', oldGroup.id);
            if (delErr) { console.error(`  Error deleting old group:`, delErr.message); continue; }
            console.log(`  ✅ Merged "${oldName}" into existing "${newName}"`);
        } else {
            console.log(`  ⚠️  "${oldName}" not found in DB`);
        }
    } else {
        // Just rename
        const { error: renErr } = await supabase
            .from('specimen_groups')
            .update({ name: newName })
            .eq('name', oldName);
        if (renErr) { console.error(`  Error renaming "${oldName}":`, renErr.message); continue; }
        console.log(`  ✅ Renamed "${oldName}" → "${newName}"`);
    }
}

// Verify
const { data: groups } = await supabase.from('specimen_groups').select('name').order('name');
console.log('\nGroups in DB now:');
groups?.forEach(g => console.log(`  • ${g.name}`));
