// Add display_area column + update all records from data.json
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readAdminPassword } from './scripts/read-password.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://wwkrpbxtvkaxfbewhdor.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3a3JwYnh0dmtheGZiZXdoZG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTgzNTQsImV4cCI6MjEwMDc3NDM1NH0.YwbHnNsMEvqDtPD7nJQ0nWlyCbiSgEOO6XQRrNdQvug';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const password = await readAdminPassword();

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
    if (authError) throw new Error(`Login fail: ${authError.message}`);
    console.log('Logged in OK');

    const records = JSON.parse(fs.readFileSync(path.join(__dirname, 'scratch_xlsx/data.json'), 'utf8'));
    if (!Array.isArray(records) || records.length === 0) {
        throw new Error('Không có bản ghi hợp lệ trong scratch_xlsx/data.json');
    }

    // Resolve groups in batches; do not fetch unused columns or issue N+1 writes.
    const groupCache = new Map();
    const groupNames = [...new Set(records.map(r => String(r['Nhóm mẫu'] || '').trim()).filter(Boolean))];
    let existingGroups = [];
    if (groupNames.length) {
        const result = await supabase
            .from('specimen_groups')
            .select('id, name');
        if (result.error) throw new Error(`Không đọc được nhóm mẫu: ${result.error.message}`);
        existingGroups = result.data || [];
    }
    existingGroups.forEach(g => groupCache.set(g.name.toLowerCase(), g.id));
    const missingGroups = groupNames
        .filter(name => !groupCache.has(name.toLowerCase()))
        .map(name => ({ name }));
    if (missingGroups.length) {
        const { data: insertedGroups, error: groupInsertError } = await supabase
            .from('specimen_groups')
            .upsert(missingGroups, { onConflict: 'name' })
            .select('id, name');
        if (groupInsertError) throw new Error(`Không tạo được nhóm mẫu: ${groupInsertError.message}`);
        insertedGroups?.forEach(g => groupCache.set(g.name.toLowerCase(), g.id));
    }

    // Resolve sites in batches. Existing sites remain authoritative so a CSV
    // re-run cannot silently overwrite manually corrected coordinates.
    const siteCache = new Map();
    const uniqueSites = [...new Map(records
        .map(r => [String(r['Nơi thu'] || '').trim(), r])
        .filter(([name]) => Boolean(name))).values()];
    const siteNames = uniqueSites.map(r => String(r['Nơi thu']).trim());
    let existingSites = [];
    if (siteNames.length) {
        const result = await supabase
            .from('collection_sites')
            .select('id, name');
        if (result.error) throw new Error(`Không đọc được địa điểm: ${result.error.message}`);
        existingSites = result.data || [];
    }
    existingSites.forEach(s => siteCache.set(s.name.toLowerCase(), s.id));
    const missingSites = uniqueSites
        .filter(r => !siteCache.has(String(r['Nơi thu']).trim().toLowerCase()))
        .map(r => {
            const name = String(r['Nơi thu']).trim();
            const site = { name };
            const lat = dmsToDecimal(r['Lat']);
            const lng = dmsToDecimal(r['Long']);
            if (lat !== null) site.latitude = lat;
            if (lng !== null) site.longitude = lng;
            return site;
        });
    if (missingSites.length) {
        const { data: insertedSites, error: siteInsertError } = await supabase
            .from('collection_sites')
            .insert(missingSites)
            .select('id, name');
        if (siteInsertError) throw new Error(`Không tạo được địa điểm: ${siteInsertError.message}`);
        insertedSites?.forEach(s => siteCache.set(s.name.toLowerCase(), s.id));
    }

    const specimens = records.map((r, i) => {
        const groupName = String(r['Nhóm mẫu'] || '').trim();
        const siteName = String(r['Nơi thu'] || '').trim();
        const code = r['Số hiệu'] || `TEMP.${Date.now()}.${i}`;
        const displayArea = shortenKhu(r['Khu vực trưng bày']);
        const payload = {
            serial_number: Number.parseInt(r.TT, 10) || null,
            specimen_code: code,
            group_id: groupCache.get(groupName.toLowerCase()) || null,
            site_id: siteCache.get(siteName.toLowerCase()) || null,
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
            const parts = String(r['Ngày thu']).split('.');
            if (parts.length === 3) {
                payload.collection_date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }
        return payload;
    });

    // One PostgREST upsert is atomic for the specimen batch.
    const { error: specimenError } = await supabase
        .from('specimens')
        .upsert(specimens, { onConflict: 'specimen_code' });
    if (specimenError) throw new Error(`Import mẫu vật thất bại: ${specimenError.message}`);
    console.log(`\nXong! OK: ${specimens.length}, Fail: 0`);
}

run().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
