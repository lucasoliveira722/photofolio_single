import { Router } from 'express';
import { getSupabaseClient } from '../supabaseClient.js';
import { mapCategory } from '../mappers.js';

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

export default router;
