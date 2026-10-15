import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase-server', () => ({ createSupabaseServerClient: vi.fn() }));

import { requireAdmin } from './auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

function fakeClient(user: { id: string } | null, isAdmin: boolean | null, rpcError: { message: string } | null = null) {
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    rpc: vi.fn().mockResolvedValue({ data: isAdmin, error: rpcError }),
  };
  vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never);
  return client;
}

describe('requireAdmin', () => {
  it('reports signed-out when there is no user', async () => {
    const client = fakeClient(null, null);
    expect(await requireAdmin()).toEqual({ ok: false, reason: 'signed-out' });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('reports not-admin when is_admin() is false', async () => {
    fakeClient({ id: 'u1' }, false);
    expect(await requireAdmin()).toEqual({ ok: false, reason: 'not-admin' });
  });

  it('reports an error, not not-admin, when is_admin() fails', async () => {
    fakeClient({ id: 'u1' }, null, { message: 'boom' });
    expect(await requireAdmin()).toEqual({ ok: false, reason: 'error', message: 'boom' });
  });

  it('returns the client and user id for the admin', async () => {
    const client = fakeClient({ id: 'u1' }, true);
    expect(await requireAdmin()).toEqual({ ok: true, supabase: client, userId: 'u1' });
    expect(client.rpc).toHaveBeenCalledWith('is_admin');
  });
});
