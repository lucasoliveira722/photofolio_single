import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('getSupabase', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('throws a clear error when env vars are missing', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', '');
    const { getSupabase } = await import('./supabase');

    expect(() => getSupabase()).toThrow(
      'Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY environment variables'
    );
  });

  it('returns one shared client when env vars are present', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'test-key');
    const { getSupabase } = await import('./supabase');

    const client = getSupabase();

    expect(client.storage).toBeDefined();
    expect(getSupabase()).toBe(client);
  });
});
