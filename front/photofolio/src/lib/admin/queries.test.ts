import { describe, it, expect } from 'vitest';
import { fakeSupabase } from '@/test/fakeSupabase';
import { getAdminData } from './queries';

const categoryRows = [
  { id: 'c1', slug: 'weddings', name: 'Weddings', display_order: 0, images: [{ count: 2 }] },
  { id: 'c2', slug: 'portraits', name: 'Portraits', display_order: 1, images: [{ count: 0 }] },
];
const imageRow = {
  id: 'i1', category_id: 'c2', storage_path: 'photos/1.jpg', title: 'Face', description: null,
  display_order: 0, is_featured: true, width: 800, height: 1200, created_at: '2026-10-14T00:00:00Z',
};

describe('getAdminData', () => {
  it('loads categories with counts and the requested category photos', async () => {
    const fake = fakeSupabase({
      'categories.select': [{ data: categoryRows, error: null }],
      'images.select': [{ data: [imageRow], error: null }],
    });

    const data = await getAdminData(fake.client, 'portraits');

    expect(data.categories).toEqual([
      { id: 'c1', slug: 'weddings', name: 'Weddings', displayOrder: 0, photoCount: 2 },
      { id: 'c2', slug: 'portraits', name: 'Portraits', displayOrder: 1, photoCount: 0 },
    ]);
    expect(data.activeCategory?.slug).toBe('portraits');
    expect(data.images).toEqual([
      {
        id: 'i1', categoryId: 'c2', storagePath: 'photos/1.jpg', title: 'Face', description: null, displayOrder: 0,
        isFeatured: true, width: 800, height: 1200,
        url: 'https://example.supabase.co/storage/v1/object/public/portfolio-images/photos/1.jpg',
      },
    ]);
    expect(fake.calls[1].chain).toContainEqual(['eq', 'category_id', 'c2']);
  });

  it('falls back to the first category for a missing or unknown slug', async () => {
    const fake = fakeSupabase({
      'categories.select': [{ data: categoryRows, error: null }],
      'images.select': [{ data: [], error: null }],
    });

    expect((await getAdminData(fake.client, 'gone')).activeCategory?.slug).toBe('weddings');
  });

  it('returns no active category when there are none', async () => {
    const fake = fakeSupabase({ 'categories.select': [{ data: [], error: null }] });
    expect(await getAdminData(fake.client)).toEqual({ categories: [], activeCategory: null, images: [] });
  });

  it('throws a readable error when loading fails', async () => {
    const fake = fakeSupabase({ 'categories.select': [{ data: null, error: { message: 'timeout' } }] });
    await expect(getAdminData(fake.client)).rejects.toThrow('Failed to load categories: timeout');
  });
});
