// Auto upload images → Supabase Storage (with WebP conversion)
// Match: TT number in filename → serial_number, or name → common_name_vi/species
// Usage: node upload_images.mjs <password> <folder_path> [--dry-run]

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL      = 'https://wwkrpbxtvkaxfbewhdor.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3a3JwYnh0dmtheGZiZXdoZG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTgzNTQsImV4cCI6MjEwMDc3NDM1NH0.YwbHnNsMEvqDtPD7nJQ0nWlyCbiSgEOO6XQRrNdQvug';
const BUCKET            = 'specimen-images';
const WEBP_QUALITY      = 80;     // 0-100, 80 is a good balance
const MAX_WIDTH         = 1200;   // max width px, keeps aspect ratio

const password  = process.argv[2];
const imgFolder = process.argv[3];
const dryRun    = process.argv.includes('--dry-run');

if (!password || !imgFolder) {
    console.error('Usage: node upload_images.mjs <password> <folder_path> [--dry-run]');
    process.exit(1);
}
if (!fs.existsSync(imgFolder)) {
    console.error('Folder not found:', imgFolder);
    process.exit(1);
}

const IMG_EXTS = new Set(['.jpg', '.jpeg', '.png', '.jfif', '.webp']);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function parseFilename(filename) {
    const base = path.parse(filename).name;
    // "213 - Ốc cối đầu tím" → tt=213
    let m = base.match(/^(\d+)[\s\-\.]+(.+?)(?:\s*\(.*\))?$/);
    if (m) return { tt: parseInt(m[1]), namePart: m[2].trim(), index: null };
    // "trai tai nghé 1" → index=1
    m = base.match(/^(.+?)\s+(\d+)$/);
    if (m) return { tt: null, namePart: m[1].trim(), index: parseInt(m[2]) };
    return { tt: null, namePart: base.trim(), index: null };
}

function norm(s) {
    return s?.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim() || '';
}

async function toWebp(filePath) {
    const buf = await sharp(filePath)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    return buf;
}

async function run() {
    const { error: authError } = await supabase.auth.signInWithPassword({
        email: 'haitrinhnt@gmail.com', password
    });
    if (authError) { console.error('Login fail:', authError.message); process.exit(1); }
    console.log('✅ Logged in\n');

    const { data: specimens } = await supabase
        .from('specimens')
        .select('id, specimen_code, serial_number, species, common_name_vi, primary_image_url');
    console.log(`📦 ${specimens.length} specimens loaded from DB`);

    const byTT      = new Map();
    const bySpecies = new Map();
    const byViet    = new Map();
    for (const s of specimens) {
        if (s.serial_number)   byTT.set(s.serial_number, s);
        if (s.species)         bySpecies.set(norm(s.species), s);
        if (s.common_name_vi)  byViet.set(norm(s.common_name_vi), s);
    }

    const files = fs.readdirSync(imgFolder)
        .filter(f => IMG_EXTS.has(path.extname(f).toLowerCase()))
        .sort();
    console.log(`🖼️  ${files.length} image files found\n`);

    let uploaded = 0, skipped = 0, noMatch = 0;
    const noMatchList = [];

    for (const filename of files) {
        const { tt, namePart, index } = parseFilename(filename);

        // --- Match ---
        let specimen = null, matchHow = '';
        if (tt !== null && byTT.has(tt)) {
            specimen = byTT.get(tt); matchHow = `TT=${tt}`;
        }
        if (!specimen) {
            const key = norm(namePart);
            if (bySpecies.has(key)) { specimen = bySpecies.get(key); matchHow = `species`; }
            else if (byViet.has(key)) { specimen = byViet.get(key); matchHow = `viet`; }
        }

        if (!specimen) {
            console.log(`  ⚠️  no match: ${filename}`);
            noMatchList.push(filename);
            noMatch++;
            continue;
        }

        // Storage path: ASCII-safe only (no Vietnamese, no spaces)
        const fileIndex = tt !== null ? tt : (index !== null ? index : uploaded + 1);
        const storagePath = `${specimen.specimen_code}/${String(fileIndex).padStart(3, '0')}.webp`;
        const isPrimary = !specimen.primary_image_url || index === 1 || index === null;

        if (dryRun) {
            console.log(`  [DRY] ${filename} → ${specimen.specimen_code} (${matchHow})${isPrimary ? ' [primary]' : ''}`);
            uploaded++;
            continue;
        }

        // --- Convert to WebP ---
        let webpBuf;
        try {
            webpBuf = await toWebp(path.join(imgFolder, filename));
        } catch (e) {
            console.error(`  ❌ Convert fail ${filename}:`, e.message);
            skipped++;
            continue;
        }

        // Delete existing file first (avoid RLS upsert restriction on existing objects)
        await supabase.storage.from(BUCKET).remove([storagePath]);

        // --- Upload ---
        const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, webpBuf, { contentType: 'image/webp', upsert: false });

        if (upErr) {
            console.error(`  ❌ Upload fail ${filename}:`, upErr.message);
            skipped++;
            continue;
        }

        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

        // --- Update DB ---
        if (isPrimary) {
            await supabase.from('specimens')
                .update({ primary_image_url: publicUrl })
                .eq('id', specimen.id);
            specimen.primary_image_url = publicUrl;
        }

        const { error: imgErr } = await supabase.from('specimen_images').upsert([{
            specimen_id: specimen.id,
            image_url:   publicUrl,
            is_primary:  isPrimary,
            caption:     specimen.common_name_vi || specimen.species || '',
            sort_order:  index || 0,
        }], { onConflict: 'image_url' });
        // RLS may block duplicate upsert — non-fatal, storage + primary_image_url already updated
        if (imgErr && !imgErr.message.includes('row-level security')) {
            console.warn(`  ⚠️  specimen_images insert warn: ${imgErr.message}`);
        }

        const origSize = fs.statSync(path.join(imgFolder, filename)).size;
        const webpSize = webpBuf.length;
        const saving   = Math.round((1 - webpSize / origSize) * 100);
        console.log(`  ✅ ${filename} → ${specimen.specimen_code} (${matchHow}) | ${(origSize/1024).toFixed(0)}KB → ${(webpSize/1024).toFixed(0)}KB WebP (-${saving}%)${isPrimary ? ' [primary]' : ''}`);
        uploaded++;
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📊 Kết quả:`);
    console.log(`   ✅ Uploaded : ${uploaded}`);
    console.log(`   ❌ Error    : ${skipped}`);
    console.log(`   ⚠️  No match : ${noMatch}`);
    if (noMatchList.length) {
        console.log(`\n   File chưa match (xử lý thủ công):`);
        noMatchList.forEach(f => console.log(`     - ${f}`));
    }
}

run();
