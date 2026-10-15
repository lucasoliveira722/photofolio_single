import { describe, it, expect } from 'vitest';
import { sortableAnnouncements } from './announcements';

const names: Record<string, string> = { a: 'Dunes', b: 'Sunset' };
const announce = sortableAnnouncements((id) => names[String(id)] ?? 'item');
const item = (id: string) => ({ id }) as never;

describe('sortableAnnouncements', () => {
  it('names the items instead of reading their ids', () => {
    expect(announce.onDragStart({ active: item('a') })).toBe('Picked up Dunes.');
    expect(announce.onDragOver({ active: item('a'), over: item('b') })).toBe('Dunes was moved over Sunset.');
    expect(announce.onDragEnd({ active: item('a'), over: item('b') })).toBe('Dunes was dropped over Sunset.');
    expect(announce.onDragCancel({ active: item('a'), over: null })).toBe('Dragging was cancelled. Dunes was dropped.');
  });

  it('handles moving outside the list', () => {
    expect(announce.onDragOver({ active: item('a'), over: null })).toBe('Dunes is no longer over the list.');
    expect(announce.onDragEnd({ active: item('a'), over: null })).toBe('Dunes was dropped.');
  });
});
