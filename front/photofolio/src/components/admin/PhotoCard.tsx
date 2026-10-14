'use client';

import Image from 'next/image';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { AdminImage } from '@/lib/admin/types';

type PhotoCardProps = {
  image: AdminImage;
  onEdit: () => void;
  onToggleFeatured: () => void;
};

export default function PhotoCard({ image, onEdit, onToggleFeatured }: PhotoCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-col gap-2 ${isDragging ? 'relative z-10 opacity-80' : ''}`}
    >
      <button type="button" onClick={onEdit} aria-label={`Edit ${image.title}`} className="group relative block aspect-square overflow-hidden bg-line">
        <Image
          src={image.url}
          alt={image.title}
          fill
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-opacity group-hover:opacity-[0.88]"
        />
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Reorder ${image.title}`}
          className="cursor-grab text-muted hover:text-ink"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <span className="flex-1 truncate text-xs">{image.title}</span>
        <button
          type="button"
          onClick={onToggleFeatured}
          aria-label={`Featured: ${image.title}`}
          aria-pressed={image.isFeatured}
          className={`text-base leading-none transition-colors ${image.isFeatured ? 'text-ink' : 'text-line hover:text-muted'}`}
        >
          ★
        </button>
      </div>
    </li>
  );
}
