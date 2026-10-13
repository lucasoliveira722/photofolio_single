'use client';

import { useState } from 'react';
import Image from 'next/image';
import Lightbox from './Lightbox';
import type { PortfolioImage } from '@/lib/api';

type ImageGridProps = {
  images: PortfolioImage[];
};

export default function ImageGrid({ images }: ImageGridProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="relative aspect-square overflow-hidden rounded"
          >
            <Image
              src={image.url}
              alt={image.title || image.description || ''}
              width={image.width}
              height={image.height}
              className="h-full w-full object-cover"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          </button>
        ))}
      </div>
      {openIndex !== null && (
        <Lightbox images={images} index={openIndex} onClose={() => setOpenIndex(null)} onNavigate={setOpenIndex} />
      )}
    </>
  );
}
