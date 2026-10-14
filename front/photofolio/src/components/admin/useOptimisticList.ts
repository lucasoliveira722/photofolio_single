'use client';

import { useState } from 'react';
import type { ActionResult } from '@/lib/admin/types';

// A local copy of a server-provided list for optimistic updates. It resets
// whenever the server sends a new list (after an action revalidates).
export function useOptimisticList<T>(serverItems: T[]) {
  const [items, setItems] = useState(serverItems);
  const [source, setSource] = useState(serverItems);

  if (serverItems !== source) {
    setSource(serverItems);
    setItems(serverItems);
  }

  async function update(next: T[], save: () => Promise<ActionResult>): Promise<ActionResult> {
    const previous = items;
    setItems(next);
    const result = await save();
    if (!result.ok) setItems(previous);
    return result;
  }

  return [items, update] as const;
}
