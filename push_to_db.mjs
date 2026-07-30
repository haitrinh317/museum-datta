// Add display_area column + update all records from data.json
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://wwkrpbxtvkaxfbewhdor.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3a3JwYnh0dmtheGZiZXdoZG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTgzNTQsImV4cCI6MjEwMDc3NDM1NH0.YwbHnNsMEvqDtPD7nJQ0nWlyCbiSgEOO6XQRrNdQvug';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const password = process.argv[2];
if (!password) { console.error('Need password'); process.exit(1); }

function dmsToDecimal(s) {
    if (!s) return null;
    const m = s.trim().match(/(\d+)°(\d+)'([\d.]+)/);
    if (m) return parseFloat(m[1]) + parseFloat(m[2])/60 + parseFloat(m[3])/3600;
    const f = parseFloat(s);
    return isNaN(f) ? null : f;
}

function shortenKhu(val) {
    val = (val || '').trim();
    for (const prefix of ['Khu trưng bày ', 'Khu vực trưng bày ']) {
        if (val.toLowerCase().startsWith(prefix.toLowerCase()))
            return val.slice(prefix.length).trim();
    }
    return val;
}

async function run() {
    const { error: authError } = await supabase.auth.signInWithPassword({
        email: 'haitrinhnt@gmail.com', password
    });
    if (authError) { console.error('Login fail:', authError.message); return; }
    console.log('Logged in OK');

    const records = JSON.parse(fs.readFileSync(path.join(__dirname, 'scratch_xlsx/data.json'), 'utf8'));

    // Cache groups & sites
    const groupCache = new Map();
    const { data: existingGroups } = await supabase.from('specimen_groups').select('*');
    existingGroups?.forEach(g => groupCache.set(g.name.toLowerCase(), g.id));

    const siteCache = new Map();
    const { data: existingSites } = await supabase.from('collection_sites').select('*');
    existingSites?.forEach(s => siteCache.set(s.name.toLowerCase(), s.id));

    let ok = 0, fail = 0;
    for (let i = 0; i < records.length; i++) {
        const r = records[i];

        // Group
        let groupId = null;
        const gName = r['Nhóm mẫu']?.trim();
        if (gName) {
            const key = gName.toLowerCase();
            if (groupCache.has(key)) {
                groupId = groupCache.get(key);
            } else {
                const { data: newG } = await supabase.from('specimen_groups').insert([{name:gName}]).select().single();
                if (newG) { groupId = newG.id; groupCache.set(key, groupId); }
            }
        }

        // Site
        let siteId = null;
        const sName = r['Nơi thu']?.trim();
        if (sName) {
            const key = sName.toLowerCase();
            if (siteCache.has(key)) {
                siteId = siteCache.get(key);
            } else {
                const lat = dmsToDecimal(r['Lat']);
                const lng = dmsToDecimal(r['Long']);
                const sp = { name: sName };
                if (lat !== null) sp.latitude = lat;
                if (lng !== null) sp.longitude = lng;
                const { data: newS } = await supabase.from('collection_sites').insert([sp]).select().single();
                if (newS) { siteId = newS.id; siteCache.set(key, siteId); }
            }
        }

        const code = r['Số hiệu'] || `TEMP.${Date.now()}.${i}`;
        const displayArea = shortenKhu(r['Khu vực trưng bày']);
        const payload = {
            specimen_code: code,
            group_id: groupId,
            site_id: siteId,
            family: r['Họ'] || null,
            species: r['Loài'] || null,
            author: r['Tác giả'] || null,
            common_name_vi: r['Tên việt'] || null,
            is_cites: r['CT'] == '1',
            iucn_status: r['IUCN'] == '1' ? 'Có' : null,
            is_red_book_vn: r['SĐVN'] == '1',
            is_exploited: r['KT'] == '1',
            is_food_use: r['TP'] == '1',
            display_area: displayArea || null,
            notes: r['Thông tin'] || null
        };

        if (r['Ngày thu']) {
            const parts = r['Ngày thu'].split('.');
            if (parts.length === 3) payload.collection_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        const { error } = await supabase.from('specimens').upsert([payload], { onConflict: 'specimen_code' });
        if (error) { console.error(`Lỗi ${code}:`, error.message); fail++; }
        else { ok++; if (ok % 50 === 0) console.log(`${ok}/${records.length}...`); }
    }
    console.log(`\nXong! OK: ${ok}, Fail: ${fail}`);
}
run();
