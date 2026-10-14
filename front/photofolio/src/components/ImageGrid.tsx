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
      <div className="columns-1 gap-2 min-[600px]:columns-2 min-[900px]:columns-3">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="group mb-2 block w-full break-inside-avoid overflow-hidden"
          >
            <Image
              src={image.url}
              alt={image.title || image.description || ''}
              width={image.width}
              height={image.height}
              className="block h-auto w-full transition-opacity duration-200 group-hover:opacity-[0.88]"
              sizes="(min-width: 900px) 33vw, (min-width: 600px) 50vw, 100vw"
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
