import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./supabase', () => ({ getSupabase: vi.fn() }));

import { ApiError, getCategories, getCategoryImages, getFeaturedImages, getProfile } from './api';
import { getSupabase } from './supabase';

type Result = { data: unknown; error: { message: string } | null };

// Mimics supabase-js's query builder: chainable, awaitable, and recording calls.
function fakeQuery(result: Result) {
  const calls: unknown[][] = [];
  const query = {
    calls,
    select: (...args: unknown[]) => {
      calls.push(['select', ...args]);
      return query;
    },
    eq: (...args: unknown[]) => {
      calls.push(['eq', ...args]);
      return query;
    },
    order: (...args: unknown[]) => {
      calls.push(['order', ...args]);
      return query;
    },
    maybeSingle: () => {
      calls.push(['maybeSingle']);
      return Promise.resolve(result);
    },
    then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

function fakeSupabase(tables: Record<string, Result>) {
  const queries: Record<string, ReturnType<typeof fakeQuery>> = {};
  const buckets: string[] = [];
  const client = {
    from: (table: string) => {
      if (!(table in tables)) throw new Error(`Unexpected table: ${table}`);
      queries[table] = fakeQuery(tables[table]);
      return queries[table];
    },
    storage: {
      from: (bucket: string) => {
        buckets.push(bucket);
        return {
          getPublicUrl: (path: string) => ({
            data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/${bucket}/${path}` },
          }),
        };
      },
    },
  };
  vi.mocked(getSupabase).mockReturnValue(client as unknown as ReturnType<typeof getSupabase>);
  return { queries, buckets };
}

const imageRow = {
  id: 'img-1',
  category_id: 'cat-1',
  storage_path: 'weddings/a.jpg',
  title: 'A',
  description: null,
  display_order: 0,
  is_featured: true,
  width: 800,
  height: 600,
  created_at: '2026-10-13T00:00:00Z',
};

const mappedImage = {
  id: 'img-1',
  title: 'A',
  description: null,
  displayOrder: 0,
  isFeatured: true,
  width: 800,
  height: 600,
  url: 'https://example.supabase.co/storage/v1/object/public/portfolio-images/weddings/a.jpg',
};

beforeEach(() => {
  vi.mocked(getSupabase).mockReset();
});

describe('getCategories', () => {
  it('returns categories mapped to camelCase, ordered by display_order', async () => {
    const { queries } = fakeSupabase({
      categories: {
        data: [
          { id: '1', slug: 'weddings', name: 'Weddings', display_order: 0 },
          { id: '2', slug: 'portraits', name: 'Portraits', display_order: 1 },
        ],
        error: null,
      },
    });

    const result = await getCategories();

    expect(result).toEqual([
      { id: '1', slug: 'weddings', name: 'Weddings', displayOrder: 0 },
      { id: '2', slug: 'portraits', name: 'Portraits', displayOrder: 1 },
    ]);
    expect(queries.categories.calls).toContainEqual(['order', 'display_order', { ascending: true }]);
  });

  it('rejects with ApiError 500 when Supabase returns an error', async () => {
    fakeSupabase({ categories: { data: null, error: { message: 'db down' } } });

    await expect(getCategories()).rejects.toBeInstanceOf(ApiError);
    await expect(getCategories()).rejects.toMatchObject({ status: 500 });
  });

  it('returns an empty list when Supabase returns no data and no error', async () => {
    fakeSupabase({ categories: { data: null, error: null } });

    await expect(getCategories()).resolves.toEqual([]);
  });

  it('rejects (instead of throwing synchronously) when the client cannot be created', async () => {
    vi.mocked(getSupabase).mockImplementation(() => {
      throw new Error('Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY environment variables');
    });

    await expect(getCategories()).rejects.toThrow(/Missing SUPABASE_URL/);
  });
});

describe('getCategoryImages', () => {
  it('returns the category images with public URLs from the portfolio-images bucket', async () => {
    const { queries, buckets } = fakeSupabase({
      categories: { data: { id: 'cat-1' }, error: null },
      images: { data: [imageRow], error: null },
    });

    const result = await getCategoryImages('weddings');

    expect(result).toEqual([mappedImage]);
    expect(queries.categories.calls).toContainEqual(['eq', 'slug', 'weddings']);
    expect(queries.images.calls).toContainEqual(['eq', 'category_id', 'cat-1']);
    expect(queries.images.calls).toContainEqual(['order', 'display_order', { ascending: true }]);
    expect(buckets).toEqual(['portfolio-images']);
  });

  it('passes the slug to the query verbatim', async () => {
    const { queries } = fakeSupabase({
      categories: { data: { id: 'cat-1' }, error: null },
      images: { data: [], error: null },
    });

    await getCategoryImages('black & white');

    expect(queries.categories.calls).toContainEqual(['eq', 'slug', 'black & white']);
  });

  it('rejects with ApiError 404 for an unknown slug', async () => {
    fakeSupabase({
      categories: { data: null, error: null },
      images: { data: [], error: null },
    });

    const promise = getCategoryImages('unknown');

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 404, message: expect.stringMatching(/^Category not found/) });
  });

  it('rejects with ApiError 500, not 404, when the category lookup fails', async () => {
    fakeSupabase({
      categories: { data: null, error: { message: 'db down' } },
      images: { data: [], error: null },
    });

    await expect(getCategoryImages('weddings')).rejects.toMatchObject({ status: 500 });
  });

  it('rejects with ApiError 500 when the images query fails', async () => {
    fakeSupabase({
      categories: { data: { id: 'cat-1' }, error: null },
      images: { data: null, error: { message: 'db down' } },
    });

    await expect(getCategoryImages('weddings')).rejects.toMatchObject({ status: 500 });
  });
});

describe('getFeaturedImages', () => {
  it('returns featured images ordered by display_order, with public URLs', async () => {
    const { queries } = fakeSupabase({ images: { data: [imageRow], error: null } });

    const result = await getFeaturedImages();

    expect(result).toEqual([mappedImage]);
    expect(queries.images.calls).toContainEqual(['eq', 'is_featured', true]);
    expect(queries.images.calls).toContainEqual(['order', 'display_order', { ascending: true }]);
  });

  it('rejects with ApiError 500 when Supabase returns an error', async () => {
    fakeSupabase({ images: { data: null, error: { message: 'db down' } } });

    await expect(getFeaturedImages()).rejects.toMatchObject({ status: 500 });
  });
});

describe('getProfile', () => {
  it('returns the single profile row', async () => {
    const { queries } = fakeSupabase({
      site_profile: { data: { bio: 'Olá', email: 'lucas@example.com', instagram: 'lucas.foto' }, error: null },
    });

    await expect(getProfile()).resolves.toEqual({ bio: 'Olá', email: 'lucas@example.com', instagram: 'lucas.foto' });
    expect(queries.site_profile.calls).toContainEqual(['select', 'bio, email, instagram']);
  });

  it('returns an empty profile when the row is missing', async () => {
    fakeSupabase({ site_profile: { data: null, error: null } });

    await expect(getProfile()).resolves.toEqual({ bio: '', email: '', instagram: '' });
  });

  it('rejects with ApiError 500 when Supabase returns an error', async () => {
    fakeSupabase({ site_profile: { data: null, error: { message: 'db down' } } });

    await expect(getProfile()).rejects.toMatchObject({ status: 500 });
  });
});
