'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { createCategory, reorderCategories } from '@/app/(admin)/admin/actions';
import { moveId } from '@/lib/admin/reorder';
import type { ActionFailure, AdminCategory } from '@/lib/admin/types';
import CategoryRow from './CategoryRow';
import ErrorNotice from './ErrorNotice';
import { inputClass, labelClass, textButtonClass } from './styles';
import { useOptimisticList } from './useOptimisticList';

type CategoryListProps = {
  categories: AdminCategory[];
  activeSlug: string | null;
};

export default function CategoryList({ categories, activeSlug }: CategoryListProps) {
  const router = useRouter();
  const [items, update] = useOptimisticList(categories);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = moveId(items.map((category) => category.id), String(active.id), String(over.id));
    const next = ids.map((id) => items.find((category) => category.id === id)!);
    const result = await update(next, () => reorderCategories(ids));
    setFailure(result.ok ? null : result);
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    const result = await createCategory(newName);
    setCreating(false);
    setFailure(result.ok ? null : result);
    if (result.ok) {
      setNewName('');
      router.push(`/admin?category=${result.slug}`);
    }
  }

  function handleDeleted(category: AdminCategory) {
    if (category.slug === activeSlug) router.push('/admin');
  }

  return (
    <aside className="flex flex-col gap-6">
      <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted">Categories</h2>

      <DndContext id="category-list" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((category) => category.id)} strategy={verticalListSortingStrategy}>
          <ul className="border-t border-line">
            {items.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                active={category.slug === activeSlug}
                onError={setFailure}
                onDeleted={handleDeleted}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <form onSubmit={handleCreate} className="flex flex-col gap-2">
        <label htmlFor="new-category" className={labelClass}>New category</label>
        <div className="flex gap-2">
          <input
            id="new-category"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            required
            disabled={creating}
            className={inputClass}
          />
          <button type="submit" disabled={creating} className={textButtonClass}>Add</button>
        </div>
      </form>

      <ErrorNotice failure={failure} />
    </aside>
  );
}
