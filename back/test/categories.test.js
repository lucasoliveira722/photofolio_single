import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/supabaseClient.js', () => ({ getSupabaseClient: vi.fn() }));

import app from '../src/app.js';
import { getSupabaseClient } from '../src/supabaseClient.js';

function fakeSupabaseFrom(result) {
  return {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve(result),
      }),
    }),
  };
}

describe('GET /api/categories', () => {
  beforeEach(() => {
    getSupabaseClient.mockReset();
  });

  it('returns categories ordered by display_order, mapped to camelCase', async () => {
    getSupabaseClient.mockReturnValue(
      fakeSupabaseFrom({
        data: [
          { id: '1', slug: 'weddings', name: 'Weddings', display_order: 0 },
          { id: '2', slug: 'portraits', name: 'Portraits', display_order: 1 },
        ],
        error: null,
      })
    );

    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: '1', slug: 'weddings', name: 'Weddings', displayOrder: 0 },
      { id: '2', slug: 'portraits', name: 'Portraits', displayOrder: 1 },
    ]);
  });

  it('returns 500 when Supabase returns an error', async () => {
    getSupabaseClient.mockReturnValue(
      fakeSupabaseFrom({ data: null, error: { message: 'db down' } })
    );

    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(500);
  });
});
