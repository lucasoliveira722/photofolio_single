import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { imageSize } from 'image-size';
import { getSupabaseClient } from '../src/supabaseClient.js';
import { IMAGE_BUCKET } from '../src/constants.js';
import { parseArgs, buildSeedRows } from './seedPlan.js';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { category: slug, name, dir } = args;

  if (!slug || !name || !dir) {
    console.error('Usage: npm run seed -- --category=<slug> --name="<Display Name>" --dir=<path>');
    process.exitCode = 1;
    return;
  }

  const supabase = getSupabaseClient();

  let { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (!category) {
    const { data: created, error } = await supabase
      .from('categories')
      .insert({ slug, name, display_order: 0 })
      .select('id')
      .single();
    if (error) throw error;
    category = created;
    console.log(`Created category "${name}" (${slug})`);
  }

  const { data: existingImages, error: existingError } = await supabase
    .from('images')
    .select('storage_path')
    .eq('category_id', category.id);
  if (existingError) throw existingError;

  const filenames = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  const files = filenames.map((filename) => {
    const { width, height } = imageSize(readFileSync(join(dir, filename)));
    return { filename, width, height };
  });

  const rows = buildSeedRows(slug, files, {
    existingPaths: existingImages.map((image) => image.storage_path),
  });

  for (const row of rows) {
    const filename = row.storagePath.split('/').pop();
    const buffer = readFileSync(join(dir, filename));

    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(row.storagePath, buffer, { upsert: false });

    if (uploadError && !uploadError.message.includes('already exists')) {
      throw uploadError;
    }

    const { error: insertError } = await supabase.from('images').insert({
      category_id: category.id,
      storage_path: row.storagePath,
      title: row.title,
      display_order: row.displayOrder,
      width: row.width,
      height: row.height,
    });

    if (insertError) throw insertError;

    console.log(`Seeded ${row.storagePath}`);
  }

  console.log(`Done: ${rows.length} image(s) seeded into "${slug}".`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
