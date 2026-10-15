import type { Announcements, UniqueIdentifier } from '@dnd-kit/core';

// dnd-kit's default screen-reader announcements read out item ids (UUIDs here); these use names instead.
export function sortableAnnouncements(nameOf: (id: UniqueIdentifier) => string): Announcements {
  return {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${nameOf(active.id)} was moved over ${nameOf(over.id)}.` : `${nameOf(active.id)} is no longer over the list.`,
    onDragEnd: ({ active, over }) =>
      over ? `${nameOf(active.id)} was dropped over ${nameOf(over.id)}.` : `${nameOf(active.id)} was dropped.`,
    onDragCancel: ({ active }) => `Dragging was cancelled. ${nameOf(active.id)} was dropped.`,
  };
}
