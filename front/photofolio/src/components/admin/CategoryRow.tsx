'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { renameCategory, deleteCategory } from '@/app/(admin)/admin/actions';
import type { ActionFailure, AdminCategory } from '@/lib/admin/types';
import { dangerTextButtonClass, inputClass, textButtonClass } from './styles';

type CategoryRowProps = {
  category: AdminCategory;
  active: boolean;
  onError: (failure: ActionFailure | null) => void;
  onDeleted: (category: AdminCategory) => void;
};

function deletePrompt({ name, photoCount }: AdminCategory) {
  if (photoCount === 0) return `Delete ${name}?`;
  return `Delete ${name} and its ${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}?`;
}

export default function CategoryRow({ category, active, onError, onDeleted }: CategoryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
  const [mode, setMode] = useState<'view' | 'rename' | 'confirm-delete'>('view');
  const [pending, setPending] = useState(false);

  async function handleRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get('name'));
    setPending(true);
    const result = await renameCategory(category.id, name);
    setPending(false);
    onError(result.ok ? null : result);
    if (result.ok) setMode('view');
  }

  async function handleDelete() {
    setPending(true);
    const result = await deleteCategory(category.id);
    setPending(false);
    onError(result.ok ? null : result);
    if (result.ok) onDeleted(category);
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`border-b border-line py-2 ${isDragging ? 'relative z-10 bg-paper opacity-80' : ''}`}
    >
      {mode === 'rename' ? (
        <form onSubmit={handleRename} className="flex items-center gap-2">
          <input
            name="name"
            aria-label="Category name"
            defaultValue={category.name}
            autoFocus
            required
            disabled={pending}
            onKeyDown={(event) => event.key === 'Escape' && setMode('view')}
            className={inputClass}
          />
          <button type="submit" disabled={pending} className={textButtonClass}>Save</button>
        </form>
      ) : mode === 'confirm-delete' ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs">{deletePrompt(category)}</p>
          <div className="flex gap-4">
            <button type="button" onClick={handleDelete} disabled={pending} aria-label="Confirm delete" className={dangerTextButtonClass}>
              Delete
            </button>
            <button type="button" onClick={() => setMode('view')} disabled={pending} className={textButtonClass}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Reorder ${category.name}`}
            className="cursor-grab px-1 text-muted hover:text-ink"
            {...attributes}
            {...listeners}
          >
            ⠿
          </button>
          <Link
            href={`/admin?category=${category.slug}`}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-1 items-baseline justify-between gap-2 py-1 text-[13px] ${active ? 'text-ink' : 'text-muted hover:text-ink'}`}
          >
            <span className={active ? 'font-medium' : undefined}>{category.name}</span>
            <span className="text-[10px] tabular-nums">{category.photoCount}</span>
          </Link>
          <button type="button" onClick={() => setMode('rename')} aria-label={`Rename ${category.name}`} className="px-1 text-muted hover:text-ink">
            ✎
          </button>
          <button type="button" onClick={() => setMode('confirm-delete')} aria-label={`Delete ${category.name}`} className="px-1 text-muted hover:text-[#b00020]">
            ✕
          </button>
        </div>
      )}
    </li>
  );
}
