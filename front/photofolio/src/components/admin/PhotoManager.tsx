'use client';

import { useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { reorderImages, setFeatured } from '@/app/(admin)/admin/actions';
import { moveId } from '@/lib/admin/reorder';
import type { ActionFailure, AdminCategory, AdminImage } from '@/lib/admin/types';
import EditPanel from './EditPanel';
import ErrorNotice from './ErrorNotice';
import PhotoCard from './PhotoCard';
import UploadQueue from './UploadQueue';
import { useOptimisticList } from './useOptimisticList';

type PhotoManagerProps = {
  category: AdminCategory;
  categories: AdminCategory[];
  images: AdminImage[];
};

export default function PhotoManager({ category, categories, images }: PhotoManagerProps) {
  const [items, update] = useOptimisticList(images);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = items.find((image) => image.id === editingId) ?? null;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = moveId(items.map((image) => image.id), String(active.id), String(over.id));
    const next = ids.map((id) => items.find((image) => image.id === id)!);
    const result = await update(next, () => reorderImages(category.id, ids));
    setFailure(result.ok ? null : result);
  }

  async function toggleFeatured(target: AdminImage) {
    const next = items.map((image) => (image.id === target.id ? { ...image, isFeatured: !image.isFeatured } : image));
    const result = await update(next, () => setFeatured(target.id, !target.isFeatured));
    setFailure(result.ok ? null : result);
  }

  return (
    <section className="flex min-w-0 flex-col gap-6">
      <h1 className="text-3xl leading-tight">{category.name}</h1>

      <UploadQueue categoryId={category.id} />

      <ErrorNotice failure={failure} />

      {items.length === 0 ? (
        <p className="text-muted">No photos in this category yet.</p>
      ) : (
        <DndContext id="photo-grid" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((image) => image.id)} strategy={rectSortingStrategy}>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {items.map((image) => (
                <PhotoCard
                  key={image.id}
                  image={image}
                  onEdit={() => setEditingId(image.id)}
                  onToggleFeatured={() => toggleFeatured(image)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {editing && <EditPanel key={editing.id} image={editing} categories={categories} onClose={() => setEditingId(null)} />}
    </section>
  );
}
