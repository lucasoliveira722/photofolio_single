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
      aria-label={image.title || 'Photo'}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/[0.92]"
      onClick={onClose}
    >
      <div
        className="grid max-h-[90vh] w-[95vw] max-w-[1100px] grid-rows-[1fr_auto] bg-[#111] md:grid-cols-[1fr_280px] md:grid-rows-1"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative h-[60vh] bg-[#0a0a0a] md:h-[85vh]">
          <Image
            src={image.url}
            alt={image.title || image.description || ''}
            fill
            sizes="(min-width: 768px) 820px, 95vw"
            className="object-contain"
          />
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onNavigate(index - 1)}
            aria-label="Previous"
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 px-3 py-4 text-[28px] leading-none text-white/40 transition-colors hover:text-white/90 disabled:invisible"
          >
            ‹
          </button>
          <button
            type="button"
            disabled={index === images.length - 1}
            onClick={() => onNavigate(index + 1)}
            aria-label="Next"
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 px-3 py-4 text-[28px] leading-none text-white/40 transition-colors hover:text-white/90 disabled:invisible"
          >
            ›
          </button>
        </div>
        <div className="flex flex-col overflow-y-auto border-t border-white/[0.06] p-4 md:border-l md:border-t-0 md:px-6 md:py-8">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="mb-2 self-end text-base text-white/40 transition-colors hover:text-white md:mb-6"
          >
            ✕
          </button>
          {image.title && <h2 className="mb-3 text-xl leading-snug text-[#e8e4e0]">{image.title}</h2>}
          {image.description && (
            <p className="flex-1 text-xs leading-[1.7] text-white/50">{image.description}</p>
          )}
          <p className="mt-6 text-[10px] tracking-[0.15em] text-white/40">
            {index + 1} / {images.length}
          </p>
        </div>
      </div>
    </div>
  );
}
