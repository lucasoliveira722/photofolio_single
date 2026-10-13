import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/supabaseClient.js', () => ({ getSupabaseClient: vi.fn() }));

import app from '../src/app.js';
import { getSupabaseClient } from '../src/supabaseClient.js';

function fakeSupabase({ imagesResult, publicUrlFn }) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve(imagesResult),
        }),
      }),
    }),
    storage: {
      from: () => ({
        getPublicUrl: publicUrlFn,
      }),
    },
  };
}

describe('GET /api/images/featured', () => {
  beforeEach(() => {
    getSupabaseClient.mockReset();
  });

  it('returns featured images ordered by display_order', async () => {
    getSupabaseClient.mockReturnValue(
      fakeSupabase({
        imagesResult: {
          data: [
            {
              id: 'img-1',
              storage_path: 'weddings/hero.jpg',
              title: 'Hero',
              description: 'A hero shot',
              display_order: 0,
              is_featured: true,
              width: 1600,
              height: 900,
            },
          ],
          error: null,
        },
        publicUrlFn: () => ({
          data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/portfolio-images/weddings/hero.jpg' },
        }),
      })
    );

    const res = await request(app).get('/api/images/featured');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 'img-1',
        title: 'Hero',
        description: 'A hero shot',
        displayOrder: 0,
        isFeatured: true,
        width: 1600,
        height: 900,
        url: 'https://example.supabase.co/storage/v1/object/public/portfolio-images/weddings/hero.jpg',
      },
    ]);
  });

  it('returns 500 when Supabase returns an error', async () => {
    getSupabaseClient.mockReturnValue(
      fakeSupabase({ imagesResult: { data: null, error: { message: 'db down' } }, publicUrlFn: () => ({ data: { publicUrl: '' } }) })
    );

    const res = await request(app).get('/api/images/featured');

    expect(res.status).toBe(500);
  });
});
