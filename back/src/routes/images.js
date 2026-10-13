import { Router } from 'express';
import { getSupabaseClient } from '../supabaseClient.js';
import { mapImage } from '../mappers.js';
import { IMAGE_BUCKET } from '../constants.js';

const router = Router();

router.get('/featured', async (req, res) => {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('images')
    .select('*')
    .eq('is_featured', true)
    .order('display_order', { ascending: true });

  if (error) {
    res.status(500).json({ error: 'Failed to load featured images' });
    return;
  }

  const mapped = data.map((row) => {
    const { data: urlData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(row.storage_path);
    return mapImage(row, urlData.publicUrl);
  });

  res.json(mapped);
});

export default router;
