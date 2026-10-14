'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { updateImage, deleteImage } from '@/app/(admin)/admin/actions';
import type { ActionFailure, AdminCategory, AdminImage } from '@/lib/admin/types';
import ErrorNotice from './ErrorNotice';
import { dangerTextButtonClass, inputClass, labelClass, primaryButtonClass, textButtonClass } from './styles';

type EditPanelProps = {
  image: AdminImage;
  categories: AdminCategory[];
  onClose: () => void;
};

export default function EditPanel({ image, categories, onClose }: EditPanelProps) {
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    const result = await updateImage(image.id, {
      title: String(form.get('title')),
      description: String(form.get('description')),
      categoryId: String(form.get('categoryId')),
    });
    setPending(false);
    if (result.ok) onClose();
    else setFailure(result);
  }

  async function handleDelete() {
    setPending(true);
    const result = await deleteImage(image.id);
    setPending(false);
    if (result.ok) onClose();
    else setFailure(result);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit photo"
        className="flex h-full w-full max-w-[380px] flex-col gap-5 overflow-y-auto border-l border-line bg-paper p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-xl">Edit photo</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">✕</button>
        </div>

        <div className="relative aspect-[4/3] bg-line">
          <Image src={image.url} alt={image.title} fill sizes="380px" className="object-contain" />
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label htmlFor="edit-title" className={labelClass}>Title</label>
            <input id="edit-title" name="title" defaultValue={image.title} required autoFocus className={inputClass} />
          </div>
          <div>
            <label htmlFor="edit-description" className={labelClass}>Description</label>
            <textarea id="edit-description" name="description" defaultValue={image.description ?? ''} rows={4} className={`${inputClass} resize-y`} />
          </div>
          <div>
            <label htmlFor="edit-category" className={labelClass}>Category</label>
            <select id="edit-category" name="categoryId" defaultValue={image.categoryId} className={inputClass}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          <ErrorNotice failure={failure} />

          <button type="submit" disabled={pending} className={primaryButtonClass}>Save</button>
        </form>

        <div className="mt-auto border-t border-line pt-4">
          {confirmingDelete ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs">Delete this photo? This can&apos;t be undone.</p>
              <div className="flex gap-4">
                <button type="button" onClick={handleDelete} disabled={pending} aria-label="Confirm delete" className={dangerTextButtonClass}>
                  Delete
                </button>
                <button type="button" onClick={() => setConfirmingDelete(false)} disabled={pending} className={textButtonClass}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmingDelete(true)} className={dangerTextButtonClass}>
              Delete photo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
