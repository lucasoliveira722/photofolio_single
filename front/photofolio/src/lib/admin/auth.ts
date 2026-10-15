import 'server-only';
import { createSupabaseServerClient, type AdminSupabase } from '@/lib/supabase-server';

export type AdminAuth =
  | { ok: true; supabase: AdminSupabase; userId: string }
  | { ok: false; reason: 'signed-out' | 'not-admin' }
  | { ok: false; reason: 'error'; message: string };

// A convenience check for pages and actions; row-level security is the real protection.
export async function requireAdmin(): Promise<AdminAuth> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'signed-out' };

  const { data: isAdmin, error } = await supabase.rpc('is_admin');
  if (error) return { ok: false, reason: 'error', message: error.message };
  if (!isAdmin) return { ok: false, reason: 'not-admin' };

  return { ok: true, supabase, userId: user.id };
}
