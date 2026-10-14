import type { AdminSupabase } from '@/lib/supabase-server';

type Result = { data: unknown; error: { message: string } | null };
export type QueryCall = { table: string; op: string; chain: unknown[][] };

// A chainable, awaitable stand-in for supabase-js. Results are queued per
// "<table>.<select|insert|update|delete>", "rpc.<name>", or "storage.<method>";
// anything not queued resolves to { data: null, error: null }.
export function fakeSupabase(results: Record<string, Result[]> = {}) {
  const calls: QueryCall[] = [];
  const storageCalls: { bucket: string; method: string; args: unknown[] }[] = [];
  const rpcCalls: { fn: string; args: unknown }[] = [];
  const take = (key: string): Result => results[key]?.shift() ?? { data: null, error: null };

  function query(table: string) {
    const call: QueryCall = { table, op: '', chain: [] };
    calls.push(call);
    const builder: { [method: string]: unknown } = {};
    for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'limit', 'maybeSingle', 'single']) {
      builder[method] = (...args: unknown[]) => {
        if (!call.op && ['select', 'insert', 'update', 'delete'].includes(method)) call.op = method;
        call.chain.push([method, ...args]);
        return builder;
      };
    }
    builder.then = (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(take(`${table}.${call.op}`)).then(resolve, reject);
    return builder;
  }

  const client = {
    from: query,
    rpc: (fn: string, args?: unknown) => {
      rpcCalls.push({ fn, args });
      return Promise.resolve(take(`rpc.${fn}`));
    },
    storage: {
      from: (bucket: string) => ({
        remove: (paths: string[]) => {
          storageCalls.push({ bucket, method: 'remove', args: [paths] });
          return Promise.resolve(take('storage.remove'));
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/${bucket}/${path}` },
        }),
      }),
    },
  };

  return { client: client as unknown as AdminSupabase, calls, storageCalls, rpcCalls };
}
