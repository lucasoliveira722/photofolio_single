import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('getSupabaseClient', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('throws when env vars are missing', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const { getSupabaseClient } = await import('../src/supabaseClient.js');
    expect(() => getSupabaseClient()).toThrow(/Missing SUPABASE_URL/);
  });

  it('returns a client when env vars are present', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
    const { getSupabaseClient } = await import('../src/supabaseClient.js');
    const client = getSupabaseClient();
    expect(client).toBeDefined();
    expect(client.storage).toBeDefined();
  });
});
