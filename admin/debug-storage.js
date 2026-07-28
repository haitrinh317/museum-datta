// ponytail: one-shot diagnostic script — run in browser console at http://localhost:3000/admin/
// Checks: (1) bucket exists, (2) can upload, (3) can get public URL
import { supabase } from '/src/lib/supabase.js';

async function diagnoseStorage() {
  console.log('=== Storage Diagnostics ===');

  // 1. List buckets
  const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
  console.log('Buckets:', buckets?.map(b => b.id), bucketsErr?.message);

  // 2. List files in specimen-images
  const { data: files, error: filesErr } = await supabase.storage
    .from('specimen-images')
    .list('', { limit: 5 });
  console.log('Files in specimen-images:', files, filesErr?.message);

  // 3. Try upload a tiny test blob
  const blob = new Blob(['test'], { type: 'image/png' });
  const testName = `_test/${Date.now()}.png`;
  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('specimen-images')
    .upload(testName, blob, { upsert: true });
  console.log('Upload test:', uploadData, uploadErr?.message);

  if (!uploadErr) {
    const { data: { publicUrl } } = supabase.storage
      .from('specimen-images')
      .getPublicUrl(testName);
    console.log('Public URL:', publicUrl);

    // Cleanup
    await supabase.storage.from('specimen-images').remove([testName]);
    console.log('Cleanup done');
  }
}

diagnoseStorage();
