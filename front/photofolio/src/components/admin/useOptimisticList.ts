'use client';

import { useState } from 'react';
import type { ActionResult } from '@/lib/admin/types';

// A local copy of a server-provided list for optimistic updates. It resets
// whenever the server sends a new list (after an action revalidates).
export function useOptimisticList<T>(serverItems: T[]) {
  // Kept together so a failed save can roll back to the latest server list,
  // which already includes anything saved while this save was in flight.
  const [state, setState] = useState({ source: serverItems, items: serverItems });

  if (serverItems !== state.source) {
    setState({ source: serverItems, items: serverItems });
  }

  async function update(next: T[], save: () => Promise<ActionResult>): Promise<ActionResult> {
    setState((current) => ({ ...current, items: next }));
    const result = await save();
    if (!result.ok) setState((current) => ({ ...current, items: current.source }));
    return result;
  }

  return [state.items, update] as const;
}
