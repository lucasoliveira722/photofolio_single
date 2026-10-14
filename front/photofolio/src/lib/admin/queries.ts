import 'server-only';
import type { AdminSupabase } from '@/lib/supabase-server';
import { IMAGE_BUCKET } from '@/lib/storage';
import type { AdminCategory, AdminImage } from './types';

export async function getAdminData(
  supabase: AdminSupabase,
  requestedSlug?: string
): Promise<{ categories: AdminCategory[]; activeCategory: AdminCategory | null; images: AdminImage[] }> {
  const { data: categoryRows, error } = await supabase
    .from('categories')
    .select('id, slug, name, display_order, images(count)')
    .order('display_order', { ascending: true });
  if (error) throw new Error(`Failed to load categories: ${error.message}`);

  const categories: AdminCategory[] = categoryRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    displayOrder: row.display_order,
    photoCount: row.images[0]?.count ?? 0,
  }));

  const activeCategory = categories.find((category) => category.slug === requestedSlug) ?? categories[0] ?? null;
  if (!activeCategory) return { categories, activeCategory, images: [] };

  const { data: imageRows, error: imagesError } = await supabase
    .from('images')
    .select('*')
    .eq('category_id', activeCategory.id)
    .order('display_order', { ascending: true });
  if (imagesError) throw new Error(`Failed to load photos: ${imagesError.message}`);

  const images: AdminImage[] = imageRows.map((row) => ({
    id: row.id,
    categoryId: row.category_id,
    storagePath: row.storage_path,
    title: row.title,
    description: row.description,
    displayOrder: row.display_order,
    isFeatured: row.is_featured,
    width: row.width,
    height: row.height,
    url: supabase.storage.from(IMAGE_BUCKET).getPublicUrl(row.storage_path).data.publicUrl,
  }));

  return { categories, activeCategory, images };
}
