import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const IMG_DIR = path.join(ROOT, 'Data/RAW/SNVH-2022/anh-mau-vat-2022');
const SUPABASE_URL = 'https://wwkrpbxtvkaxfbewhdor.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3a3JwYnh0dmtheGZiZXdoZG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTgzNTQsImV4cCI6MjEwMDc3NDM1NH0.YwbHnNsMEvqDtPD7nJQ0nWlyCbiSgEOO6XQRrNdQvug';
const BUCKET = 'specimen-images';
const MAX_WIDTH = 1200;
const WEBP_QUALITY = 80;

// Read credentials
let adminEmail = process.env.MUSEUM_ADMIN_EMAIL || '';
let adminPassword = process.env.MUSEUM_ADMIN_PASSWORD || '';

const envAdminPath = path.join(ROOT, '.env.admin.local');
if (fs.existsSync(envAdminPath)) {
  const content = fs.readFileSync(envAdminPath, 'utf8');
  for (const line of content.split('\n')) {
    if (line.includes('=') && !line.trim().startsWith('#')) {
      const [k, v] = line.split('=');
      const val = v.trim().replace(/^["']|["']$/g, '');
      if (k.trim() === 'MUSEUM_ADMIN_EMAIL' && !adminEmail) adminEmail = val;
      if (k.trim() === 'MUSEUM_ADMIN_PASSWORD' && !adminPassword && val) adminPassword = val;
    }
  }
}
if (!adminEmail) adminEmail = 'haitrinhnt@gmail.com';

if (!adminPassword) {
  console.error('❌ Cần mật khẩu admin. Hãy chạy lệnh với biến môi trường MUSEUM_ADMIN_PASSWORD.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function toWebp(filePath) {
  return await sharp(filePath)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

async function run() {
  console.log('--- BẮT ĐẦU UPLOAD ẢNH MẪU VẬT TRƯNG BÀY (TB.001 - TB.155) ---');
  console.log(`Thư mục ảnh: ${IMG_DIR}`);

  console.log(`Đăng nhập quản trị viên (${adminEmail})...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (authError) {
    throw new Error(`Đăng nhập thất bại: ${authError.message}`);
  }
  console.log('✅ Đăng nhập thành công!\n');

  // Load TB specimens from DB (filter strictly TB.001 - TB.155)
  const { data: rawSpecimens, error: specErr } = await supabase
    .from('specimens')
    .select('id, serial_number, specimen_code, common_name_vi, species, primary_image_url')
    .like('specimen_code', 'TB.%')
    .order('serial_number', { ascending: true });

  if (specErr) throw new Error(`Lỗi tải mẫu vật: ${specErr.message}`);

  const specimens = rawSpecimens.filter(s => /^TB\.\d{3}$/.test(s.specimen_code));
  console.log(`Tìm thấy ${specimens.length} mẫu vật TB.xxx trong database.`);

  const byTT = new Map();
  specimens.forEach(s => {
    const num = parseInt(s.specimen_code.replace('TB.', ''), 10);
    byTT.set(num, s);
  });

  // Scan files
  const files = fs.readdirSync(IMG_DIR).filter(f => !f.endsWith('.ini') && !f.startsWith('Không dùng')).sort();
  console.log(`Tìm thấy ${files.length} file ảnh hợp lệ cần xử lý.\n`);

  // Group files by target specimen
  const specimenFiles = new Map();
  for (const f of files) {
    const nameNoExt = path.parse(f).name;
    const m = nameNoExt.match(/^(\d+)[\s\-\.]+(.+?)$/);
    if (!m) continue;

    let tt = parseInt(m[1], 10);
    // Handle known typo in raw data: 125. Ốc bùn răng cưa is STT 124
    if (tt === 125 && /bùn răng cưa/i.test(nameNoExt)) {
      tt = 124;
    }

    if (byTT.has(tt)) {
      const spec = byTT.get(tt);
      if (!specimenFiles.has(spec.specimen_code)) {
        specimenFiles.set(spec.specimen_code, { spec, files: [] });
      }
      specimenFiles.get(spec.specimen_code).files.push(f);
    }
  }

  console.log(`Khớp được ảnh cho ${specimenFiles.size} mẫu vật khác nhau.\n`);

  let successCount = 0;
  let failCount = 0;

  for (const [code, { spec, files: imgList }] of specimenFiles.entries()) {
    console.log(`\n[${spec.specimen_code}] ${spec.common_name_vi} (${imgList.length} ảnh):`);

    let primaryStorageUrl = null;

    for (let i = 0; i < imgList.length; i++) {
      const filename = imgList[i];
      const filePath = path.join(IMG_DIR, filename);
      const fileIndex = String(i + 1).padStart(3, '0');
      const storagePath = `${code}/${fileIndex}.webp`;

      try {
        const webpBuffer = await toWebp(filePath);

        // Remove old object if exists to bypass overwrite restrictions
        await supabase.storage.from(BUCKET).remove([storagePath]);

        // Upload to Storage
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, webpBuffer, {
            contentType: 'image/webp',
            cacheControl: '2592000', // 30 days
            upsert: true,
          });

        if (uploadError) {
          console.error(`  ❌ Lỗi upload ${filename}:`, uploadError.message);
          failCount++;
          continue;
        }

        const { data: pubUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
        const publicUrl = pubUrlData.publicUrl;

        // First image becomes primary_image_url
        if (i === 0) {
          primaryStorageUrl = publicUrl;
        }

        // Also upsert into specimen_images gallery table
        await supabase.from('specimen_images').upsert([{
          specimen_id: spec.id,
          image_url: publicUrl,
          is_primary: i === 0,
          caption: spec.common_name_vi || spec.species || '',
          sort_order: i,
        }], { onConflict: 'image_url' });

        console.log(`  ✓ ${filename} → ${storagePath} (${(webpBuffer.length / 1024).toFixed(1)} KB)`);
      } catch (err) {
        console.error(`  ❌ Lỗi xử lý ${filename}:`, err.message);
        failCount++;
      }
    }

    // Update specimen primary_image_url in database
    if (primaryStorageUrl) {
      const { error: updateErr } = await supabase
        .from('specimens')
        .update({ primary_image_url: primaryStorageUrl })
        .eq('id', spec.id);

      if (updateErr) {
        console.error(`  ❌ Lỗi cập nhật primary_image_url cho ${code}:`, updateErr.message);
      } else {
        console.log(`  ⭐ Đã cập nhật primary_image_url cho ${code}`);
        successCount++;
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`🎉 HOÀN THÀNH: Đã upload & gắn ảnh cho ${successCount} mẫu vật! (Thất bại: ${failCount})`);
}

run().catch(err => {
  console.error('\n❌ LỖI:', err.message);
  process.exit(1);
});
