'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import type { PortfolioImage } from '@/lib/api';

type LightboxProps = {
  images: PortfolioImage[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

export default function Lightbox({ images, index, onClose, onNavigate }: LightboxProps) {
  const image = images[index];
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    closeButtonRef.current?.focus();
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && index > 0) onNavigate(index - 1);
      if (event.key === 'ArrowRight' && index < images.length - 1) onNavigate(index + 1);
      if (event.key === 'Tab') trapFocus(event);
    }
    function trapFocus(event: KeyboardEvent) {
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [index, images.length, onClose, onNavigate]);

  if (!image) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-full max-w-4xl flex-col items-center gap-4"
        onClick={(event) => event.stopPropagation()}
      >
        <Image
          src={image.url}
          alt={image.title || image.description || ''}
          width={image.width}
          height={image.height}
          sizes="(max-width: 896px) 100vw, 896px"
          className="max-h-[75vh] w-auto object-contain"
        />
        <div className="text-center text-white">
          <h2 className="text-lg font-semibold">{image.title}</h2>
          {image.description && <p className="text-sm text-zinc-300">{image.description}</p>}
        </div>
        <div className="flex gap-4">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onNavigate(index - 1)}
            className="rounded bg-white/10 px-4 py-2 text-white disabled:opacity-30"
          >
            Previous
          </button>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="rounded bg-white/10 px-4 py-2 text-white">
            Close
          </button>
          <button
            type="button"
            disabled={index === images.length - 1}
            onClick={() => onNavigate(index + 1)}
            className="rounded bg-white/10 px-4 py-2 text-white disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
