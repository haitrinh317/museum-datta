import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const CSV_PATH = path.join(ROOT, 'Data/mau-vat-trung-bay-chuan.csv');
const SUPABASE_URL = 'https://wwkrpbxtvkaxfbewhdor.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3a3JwYnh0dmtheGZiZXdoZG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTgzNTQsImV4cCI6MjEwMDc3NDM1NH0.YwbHnNsMEvqDtPD7nJQ0nWlyCbiSgEOO6XQRrNdQvug';

// 1. Read admin credentials from .env.admin.local or env
let adminEmail = process.env.MUSEUM_ADMIN_EMAIL || 'haitrinhnt@gmail.com';
let adminPassword = process.env.MUSEUM_ADMIN_PASSWORD || '';

const envAdminPath = path.join(ROOT, '.env.admin.local');
if (fs.existsSync(envAdminPath)) {
  const content = fs.readFileSync(envAdminPath, 'utf8');
  for (const line of content.split('\n')) {
    if (line.includes('=') && !line.trim().startsWith('#')) {
      const [k, v] = line.split('=');
      const val = v.trim().replace(/^["']|["']$/g, '');
      if (k.trim() === 'MUSEUM_ADMIN_EMAIL') adminEmail = val;
      if (k.trim() === 'MUSEUM_ADMIN_PASSWORD') adminPassword = val;
    }
  }
}

if (!adminPassword) {
  console.error('❌ Không tìm thấy mật khẩu admin trong .env.admin.local hoặc MUSEUM_ADMIN_PASSWORD.');
  process.exit(1);
}

// 2. CSV Parser supporting multiline
function parseMuseumCSV(text) {
  const lines = text.split(/\r?\n/);
  const records = [];
  let inQuote = false;
  let currentField = '';
  let fields = [];
  let headerParsed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!headerParsed) {
      headerParsed = true;
      continue;
    }

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        if (inQuote && j + 1 < line.length && line[j + 1] === '"') {
          currentField += '"';
          j++;
        } else {
          inQuote = !inQuote;
        }
      } else if (ch === ',' && !inQuote) {
        fields.push(currentField.trim());
        currentField = '';
      } else if (ch === '\r') {
        // skip
      } else {
        currentField += ch;
      }
    }

    if (!inQuote) {
      fields.push(currentField.trim());
      currentField = '';

      if (fields.length >= 18 && fields[0]) {
        const info = fields[17] || '';
        const parsed = parseThongTin(info);

        records.push({
          serial_number: parseInt(fields[0], 10) || null,
          group_name: fields[1] || '',
          specimen_code: fields[2] || '',
          family: fields[3] || null,
          species: fields[4] || null,
          author: fields[5] || null,
          common_name_vi: fields[6] || null,
          site_name: fields[7] || null,
          collection_date: parseViDate(fields[8]),
          is_cites: fields[11] === '1',
          iucn_status: fields[12] === '1' ? 'listed' : null,
          is_red_book_vn: fields[13] === '1',
          is_exploited: fields[14] === '1',
          is_food_use: fields[15] === '1',
          ...parsed,
        });
      }
      fields = [];
    } else {
      currentField += '\n';
    }
  }
  return records;
}

function parseThongTin(text) {
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const result = {
    morphology: '',
    ecology: '',
    distribution: '',
    toxicity: '',
    application: '',
    notes: '',
  };
  if (!text) return result;

  const sections = text.split(/(?=Sinh học|Sinh thái|Phân bố|Độc tố|Ứng dụng|Ghi chú)/gi);
  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    if (/^(Sinh học|Sinh thái)/i.test(trimmed)) {
      result.ecology = trimmed.replace(/^Sinh học,?\s*[Ss]inh thái:\s*/i, '').replace(/^Sinh thái:\s*/i, '').trim();
    } else if (/^Phân bố/i.test(trimmed)) {
      result.distribution = trimmed.replace(/^Phân bố:\s*/i, '').trim();
    } else if (/^Độc tố/i.test(trimmed)) {
      result.toxicity = trimmed.replace(/^Độc tố:\s*/i, '').trim();
    } else if (/^Ứng dụng/i.test(trimmed)) {
      result.application = trimmed.replace(/^Ứng dụng:\s*/i, '').trim();
    } else if (/^Ghi chú/i.test(trimmed)) {
      result.notes = trimmed.replace(/^Ghi chú:\s*/i, '').trim();
    } else {
      if (!result.morphology) {
        result.morphology = trimmed.replace(/^Màu sắc,?\s*đặc điểm:\s*/i, '').trim();
      }
    }
  }

  for (const k of Object.keys(result)) result[k] = cap(result[k]);
  return result;
}

function parseViDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('.');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y.padStart(4, '20')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

async function run() {
  console.log('--- BẮT ĐẦU IMPORT MẪU VẬT TRƯNG BÀY ---');
  console.log(`Đọc file: ${CSV_PATH}`);
  const csvText = fs.readFileSync(CSV_PATH, 'utf8');
  const records = parseMuseumCSV(csvText);
  console.log(`Đã đọc ${records.length} bản ghi hợp lệ từ CSV.`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Authenticate admin
  console.log(`Đăng nhập quản trị viên (${adminEmail})...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

  if (authError) {
    throw new Error(`Đăng nhập thất bại: ${authError.message}`);
  }
  console.log('✅ Đăng nhập thành công!');

  // 1. Resolve Groups
  console.log('\n1. Đồng bộ Nhóm mẫu (specimen_groups)...');
  const groupNames = [...new Set(records.map(r => r.group_name).filter(Boolean))];
  const groupCache = new Map();

  const { data: existingGroups, error: groupFetchErr } = await supabase
    .from('specimen_groups')
    .select('id, name');
  if (groupFetchErr) throw new Error(`Lỗi đọc groups: ${groupFetchErr.message}`);

  existingGroups?.forEach(g => groupCache.set(g.name.toLowerCase(), g.id));

  const missingGroups = groupNames
    .filter(name => !groupCache.has(name.toLowerCase()))
    .map(name => ({ name }));

  if (missingGroups.length > 0) {
    console.log(`Tạo mới ${missingGroups.length} nhóm:`, missingGroups.map(g => g.name).join(', '));
    const { data: insertedGroups, error: groupInsertErr } = await supabase
      .from('specimen_groups')
      .upsert(missingGroups, { onConflict: 'name' })
      .select('id, name');
    if (groupInsertErr) throw new Error(`Lỗi tạo groups: ${groupInsertErr.message}`);
    insertedGroups?.forEach(g => groupCache.set(g.name.toLowerCase(), g.id));
  } else {
    console.log('Tất cả nhóm mẫu đã tồn tại.');
  }

  // 2. Resolve Collection Sites
  console.log('\n2. Đồng bộ Địa điểm thu mẫu (collection_sites)...');
  const siteNames = [...new Set(records.map(r => r.site_name).filter(Boolean))];
  const siteCache = new Map();

  const { data: existingSites, error: siteFetchErr } = await supabase
    .from('collection_sites')
    .select('id, name');
  if (siteFetchErr) throw new Error(`Lỗi đọc sites: ${siteFetchErr.message}`);

  existingSites?.forEach(s => siteCache.set(s.name.toLowerCase(), s.id));

  const missingSites = siteNames
    .filter(name => !siteCache.has(name.toLowerCase()))
    .map(name => ({ name, region: 'Việt Nam' }));

  if (missingSites.length > 0) {
    console.log(`Tạo mới ${missingSites.length} địa điểm thu mẫu.`);
    const { data: insertedSites, error: siteInsertErr } = await supabase
      .from('collection_sites')
      .insert(missingSites)
      .select('id, name');
    if (siteInsertErr) throw new Error(`Lỗi tạo sites: ${siteInsertErr.message}`);
    insertedSites?.forEach(s => siteCache.set(s.name.toLowerCase(), s.id));
  } else {
    console.log('Tất cả địa điểm đã sẵn sàng.');
  }

  // 3. Batch Upsert Specimens
  console.log('\n3. Nạp mẫu vật vào bảng specimens...');
  const specimensPayload = records.map(r => {
    // Extract display area from notes if present
    let displayArea = null;
    if (r.notes && /Nơi trưng bày:\s*([^.\n]+)/i.test(r.notes)) {
      displayArea = r.notes.match(/Nơi trưng bày:\s*([^.\n]+)/i)[1].trim();
      displayArea = displayArea.replace(/^Khu(?: vực)? trưng bày\s*/i, '').trim();
    }

    return {
      serial_number: r.serial_number,
      specimen_code: r.specimen_code,
      group_id: groupCache.get(r.group_name.toLowerCase()) || null,
      site_id: r.site_name ? (siteCache.get(r.site_name.toLowerCase()) || null) : null,
      family: r.family,
      species: r.species,
      author: r.author,
      common_name_vi: r.common_name_vi,
      collection_date: r.collection_date,
      is_cites: r.is_cites,
      iucn_status: r.iucn_status,
      is_red_book_vn: r.is_red_book_vn,
      is_exploited: r.is_exploited,
      is_food_use: r.is_food_use,
      morphology: r.morphology || null,
      ecology: r.ecology || null,
      distribution: r.distribution || null,
      toxicity: r.toxicity || null,
      application: r.application || null,
      notes: r.notes || null,
      display_area: displayArea,
    };
  });

  // Upsert in chunks of 50 to avoid payload size limits
  const CHUNK_SIZE = 50;
  let totalSuccess = 0;
  for (let i = 0; i < specimensPayload.length; i += CHUNK_SIZE) {
    const chunk = specimensPayload.slice(i, i + CHUNK_SIZE);
    const { error: upsertErr } = await supabase
      .from('specimens')
      .upsert(chunk, { onConflict: 'specimen_code' });

    if (upsertErr) {
      throw new Error(`Lỗi upsert chunk ${i} - ${i + chunk.length}: ${upsertErr.message}`);
    }
    totalSuccess += chunk.length;
    console.log(`Đã nạp: ${totalSuccess} / ${specimensPayload.length} mẫu...`);
  }

  console.log(`\n🎉 HOÀN THÀNH: Đã import thành công ${totalSuccess} mẫu vật vào hệ thống CSDL!`);
}

run().catch(err => {
  console.error('\n❌ GẶP LỖI:', err.message);
  process.exit(1);
});
