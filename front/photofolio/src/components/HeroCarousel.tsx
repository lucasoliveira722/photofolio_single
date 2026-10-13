'use client';

import { useState } from 'react';
import Image from 'next/image';
import Lightbox from './Lightbox';
import type { PortfolioImage } from '@/lib/api';

type HeroCarouselProps = {
  images: PortfolioImage[];
};

export default function HeroCarousel({ images }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  const image = images[index];

  function showPrevious() {
    setIndex((current) => (current === 0 ? images.length - 1 : current - 1));
  }

  function showNext() {
    setIndex((current) => (current === images.length - 1 ? 0 : current + 1));
  }

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setLightboxIndex(index)}
        className="relative block aspect-video w-full overflow-hidden rounded"
      >
        <Image
          src={image.url}
          alt={image.title || image.description || ''}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      </button>
      {images.length > 1 && (
        <div className="mt-2 flex justify-center gap-4">
          <button type="button" onClick={showPrevious} className="rounded bg-black/10 px-3 py-1">
            Previous
          </button>
          <button type="button" onClick={showNext} className="rounded bg-black/10 px-3 py-1">
            Next
          </button>
        </div>
      )}
      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
