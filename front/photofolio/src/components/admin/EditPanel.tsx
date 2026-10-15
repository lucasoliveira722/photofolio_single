'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { updateImage, deleteImage } from '@/app/(admin)/admin/actions';
import type { ActionFailure, AdminCategory, AdminImage } from '@/lib/admin/types';
import ErrorNotice from './ErrorNotice';
import { dangerTextButtonClass, inputClass, labelClass, primaryButtonClass, textButtonClass } from './styles';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

// Moves focus around the panel's ends so Tab never reaches the page behind it.
function trapTab(event: KeyboardEvent, panel: HTMLElement) {
  const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !panel.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

type EditPanelProps = {
  image: AdminImage;
  categories: AdminCategory[];
  onClose: () => void;
};

export default function EditPanel({ image, categories, onClose }: EditPanelProps) {
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const pressedOnBackdrop = useRef(false);
  // Captured during the first render, before the title takes focus.
  const [returnFocusTo] = useState(() => document.activeElement as HTMLElement | null);

  useEffect(() => {
    titleRef.current?.focus();
    return () => returnFocusTo?.focus();
  }, [returnFocusTo]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab' && panelRef.current) trapTab(event, panelRef.current);
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
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/20"
      // Close only when the click both starts and ends on the backdrop, so a text selection
      // dragged out of the panel doesn't close it and lose the edits.
      onMouseDown={(event) => {
        pressedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressedOnBackdrop.current && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Edit photo"
        className="flex h-full w-full max-w-[380px] flex-col gap-5 overflow-y-auto border-l border-line bg-paper p-6"
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
            <input ref={titleRef} id="edit-title" name="title" defaultValue={image.title} required className={inputClass} />
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
