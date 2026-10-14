import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useOptimisticList } from './useOptimisticList';

// Server props keep the same reference between renders; mirror that with a stable array.
const serverItems = ['a', 'b'];

describe('useOptimisticList', () => {
  it('shows the new list immediately and keeps it when the save succeeds', async () => {
    const { result } = renderHook(() => useOptimisticList(serverItems));

    await act(async () => {
      await result.current[1](['b', 'a'], async () => ({ ok: true }));
    });

    expect(result.current[0]).toEqual(['b', 'a']);
  });

  it('rolls back and returns the failure when the save fails', async () => {
    const { result } = renderHook(() => useOptimisticList(serverItems));
    let outcome;

    await act(async () => {
      outcome = await result.current[1](['b', 'a'], async () => ({ ok: false, error: 'nope' }));
    });

    expect(result.current[0]).toEqual(['a', 'b']);
    expect(outcome).toEqual({ ok: false, error: 'nope' });
  });

  it('resets to a new server list', () => {
    const { result, rerender } = renderHook(({ items }) => useOptimisticList(items), {
      initialProps: { items: ['a'] },
    });

    rerender({ items: ['a', 'c'] });
    expect(result.current[0]).toEqual(['a', 'c']);
  });

  it('rolls back to the latest server list, keeping changes saved meanwhile', async () => {
    let failSave: (result: { ok: false; error: string }) => void = () => {};
    const { result, rerender } = renderHook(({ items }) => useOptimisticList(items), {
      initialProps: { items: serverItems },
    });

    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current[1](['b', 'a'], () => new Promise((resolve) => (failSave = resolve)));
    });
    // Another action saved and revalidated while this save was in flight.
    const afterOtherSave = ['a', 'b', 'c'];
    rerender({ items: afterOtherSave });

    await act(async () => {
      failSave({ ok: false, error: 'nope' });
      await pending;
    });

    expect(result.current[0]).toEqual(['a', 'b', 'c']);
  });
});
