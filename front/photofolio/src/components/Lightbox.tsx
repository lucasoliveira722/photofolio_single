'use client';

import { useEffect } from 'react';
import type { PortfolioImage } from '@/lib/api';

type LightboxProps = {
  images: PortfolioImage[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

export default function Lightbox({ images, index, onClose, onNavigate }: LightboxProps) {
  const image = images[index];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && index > 0) onNavigate(index - 1);
      if (event.key === 'ArrowRight' && index < images.length - 1) onNavigate(index + 1);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [index, images.length, onClose, onNavigate]);

  if (!image) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-full max-w-4xl flex-col items-center gap-4"
        onClick={(event) => event.stopPropagation()}
      >
        <img src={image.url} alt={image.title || image.description || ''} className="max-h-[75vh] w-auto object-contain" />
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
          <button type="button" onClick={onClose} className="rounded bg-white/10 px-4 py-2 text-white">
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
