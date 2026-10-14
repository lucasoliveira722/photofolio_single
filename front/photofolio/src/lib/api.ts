import { getSupabase } from './supabase';
import { IMAGE_BUCKET } from './storage';
import type { Tables } from './database.types';

export type Category = {
  id: string;
  slug: string;
  name: string;
  displayOrder: number;
};

export type PortfolioImage = {
  id: string;
  title: string;
  description: string | null;
  displayOrder: number;
  isFeatured: boolean;
  width: number;
  height: number;
  url: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}


type CategoryRow = Pick<Tables<'categories'>, 'id' | 'slug' | 'name' | 'display_order'>;

type ImageRow = Tables<'images'>;

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    displayOrder: row.display_order,
  };
}

function mapImage(row: ImageRow): PortfolioImage {
  const { data } = getSupabase().storage.from(IMAGE_BUCKET).getPublicUrl(row.storage_path);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    displayOrder: row.display_order,
    isFeatured: row.is_featured,
    width: row.width,
    height: row.height,
    url: data.publicUrl,
  };
}

function loadFailed(what: string, error: { message: string }): never {
  throw new ApiError(`Failed to load ${what}: ${error.message}`, 500);
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await getSupabase()
    .from('categories')
    .select('id, slug, name, display_order')
    .order('display_order', { ascending: true });

  if (error) loadFailed('categories', error);
  return (data ?? []).map(mapCategory);
}

export async function getCategoryImages(slug: string): Promise<PortfolioImage[]> {
  const supabase = getSupabase();

  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (categoryError) loadFailed('category', categoryError);
  if (!category) throw new ApiError(`Category not found: ${slug}`, 404);

  const { data, error } = await supabase
    .from('images')
    .select('*')
    .eq('category_id', category.id)
    .order('display_order', { ascending: true });

  if (error) loadFailed('images', error);
  return (data ?? []).map(mapImage);
}

export async function getFeaturedImages(): Promise<PortfolioImage[]> {
  const { data, error } = await getSupabase()
    .from('images')
    .select('*')
    .eq('is_featured', true)
    .order('display_order', { ascending: true });

  if (error) loadFailed('featured images', error);
  return (data ?? []).map(mapImage);
}
