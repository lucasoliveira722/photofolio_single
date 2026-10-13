import { Router } from 'express';
import { getSupabaseClient } from '../supabaseClient.js';
import { mapCategory, mapImage } from '../mappers.js';
import { IMAGE_BUCKET } from '../constants.js';

const router = Router();

router.get('/', async (req, res) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    res.status(500).json({ error: 'Failed to load categories' });
    return;
  }

  res.json(data.map(mapCategory));
});

router.get('/:slug/images', async (req, res) => {
  const supabase = getSupabaseClient();
  const { slug } = req.params;

  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (categoryError) {
    res.status(500).json({ error: 'Failed to load category' });
    return;
  }
  if (!category) {
    res.status(404).json({ error: `Category not found: ${slug}` });
    return;
  }

  const { data: images, error: imagesError } = await supabase
    .from('images')
    .select('*')
    .eq('category_id', category.id)
    .order('display_order', { ascending: true });

  if (imagesError) {
    res.status(500).json({ error: 'Failed to load images' });
    return;
  }

  const mapped = images.map((row) => {
    const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(row.storage_path);
    return mapImage(row, data.publicUrl);
  });

  res.json(mapped);
});

export default router;
