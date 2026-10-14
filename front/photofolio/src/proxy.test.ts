// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { getClaims } = vi.hoisted(() => ({ getClaims: vi.fn() }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url: string, _key: string, options: { cookies: { setAll: (c: unknown[], h: Record<string, string>) => void } }) => ({
    auth: {
      getClaims: () => {
        getClaims();
        options.cookies.setAll(
          [{ name: 'sb-token', value: 'fresh', options: { path: '/' } }],
          { 'Cache-Control': 'private, no-store' }
        );
        return Promise.resolve({ data: null, error: null });
      },
    },
  })),
}));

import { proxy, config } from './proxy';

describe('proxy', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'test-key');
  });

  it('refreshes the session and writes cookies and cache headers to the response', async () => {
    const response = await proxy(new NextRequest('http://localhost/admin'));

    expect(getClaims).toHaveBeenCalled();
    expect(response.cookies.get('sb-token')?.value).toBe('fresh');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('only runs for the admin area and login', () => {
    expect(config.matcher).toEqual(['/admin/:path*', '/login']);
  });
});
