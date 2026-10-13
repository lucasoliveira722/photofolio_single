import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/supabaseClient.js', () => ({ getSupabaseClient: vi.fn() }));

import app from '../src/app.js';
import { getSupabaseClient } from '../src/supabaseClient.js';

function fakeSupabase({ categoryResult, imagesResult, publicUrlFn }) {
  return {
    from: (table) => {
      if (table === 'categories') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve(categoryResult),
            }),
          }),
        };
      }
      if (table === 'images') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve(imagesResult),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
    storage: {
      from: () => ({
        getPublicUrl: publicUrlFn,
      }),
    },
  };
}

describe('GET /api/categories/:slug/images', () => {
  beforeEach(() => {
    getSupabaseClient.mockReset();
  });

  it('returns images for an existing category, with resolved URLs', async () => {
    getSupabaseClient.mockReturnValue(
      fakeSupabase({
        categoryResult: { data: { id: 'cat-1' }, error: null },
        imagesResult: {
          data: [
            {
              id: 'img-1',
              storage_path: 'weddings/a.jpg',
              title: 'A',
              description: null,
              display_order: 0,
              is_featured: false,
              width: 800,
              height: 600,
            },
          ],
          error: null,
        },
        publicUrlFn: () => ({
          data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/portfolio-images/weddings/a.jpg' },
        }),
      })
    );

    const res = await request(app).get('/api/categories/weddings/images');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 'img-1',
        title: 'A',
        description: null,
        displayOrder: 0,
        isFeatured: false,
        width: 800,
        height: 600,
        url: 'https://example.supabase.co/storage/v1/object/public/portfolio-images/weddings/a.jpg',
      },
    ]);
  });

  it('returns 404 for an unknown category slug', async () => {
    getSupabaseClient.mockReturnValue(
      fakeSupabase({
        categoryResult: { data: null, error: null },
        imagesResult: { data: [], error: null },
        publicUrlFn: () => ({ data: { publicUrl: '' } }),
      })
    );

    const res = await request(app).get('/api/categories/unknown/images');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Category not found/);
  });
});
