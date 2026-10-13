import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCategories, getCategoryImages, getFeaturedImages, ApiError } from './api';

const originalFetch = global.fetch;
const originalApiUrl = process.env.API_URL;

beforeEach(() => {
  process.env.API_URL = 'http://localhost:4000';
});

afterEach(() => {
  global.fetch = originalFetch;
  process.env.API_URL = originalApiUrl;
});

describe('getCategories', () => {
  it('fetches and returns parsed categories', async () => {
    const categories = [{ id: '1', slug: 'weddings', name: 'Weddings', displayOrder: 0 }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => categories,
    }) as unknown as typeof fetch;

    const result = await getCategories();

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:4000/api/categories');
    expect(result).toEqual(categories);
  });

  it('throws ApiError when the response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    await expect(getCategories()).rejects.toThrow(ApiError);
  });
});

describe('getCategoryImages', () => {
  it('requests the slug-scoped endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] }) as unknown as typeof fetch;

    await getCategoryImages('weddings');

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:4000/api/categories/weddings/images');
  });
});

describe('getFeaturedImages', () => {
  it('requests the featured endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] }) as unknown as typeof fetch;

    await getFeaturedImages();

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:4000/api/images/featured');
  });
});
