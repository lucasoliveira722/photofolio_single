'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Lightbox from './Lightbox';
import type { PortfolioImage } from '@/lib/api';

const AUTO_ADVANCE_MS = 5000;

type HeroCarouselProps = {
  images: PortfolioImage[];
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function HeroCarousel({ images }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const count = images.length;

  // Restarts on every slide change, so a manual change also gets the full interval.
  useEffect(() => {
    if (count < 2 || hovered || focused || userPaused || lightboxIndex !== null) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const timer = setTimeout(() => setIndex((current) => (current + 1) % count), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [index, count, hovered, focused, userPaused, lightboxIndex]);

  if (count === 0) return null;

  const image = images[index];

  function showPrevious() {
    setIndex((current) => (current - 1 + count) % count);
  }

  function showNext() {
    setIndex((current) => (current + 1) % count);
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured photos"
      className="relative h-[60dvh] min-h-[360px] w-full overflow-hidden bg-ink"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      {images.map((slide, i) => (
        <button
          key={slide.id}
          type="button"
          onClick={() => setLightboxIndex(i)}
          aria-hidden={i !== index}
          inert={i !== index}
          className={`absolute inset-0 block overflow-hidden transition-opacity duration-800 ease-in-out motion-reduce:transition-none ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Blurred, darkened copy fills the space around photos whose shape doesn't match the hero. */}
          <Image
            src={slide.url}
            alt=""
            fill
            aria-hidden
            className="scale-110 object-cover blur-2xl brightness-50"
            sizes="64px"
          />
          <Image
            src={slide.url}
            alt={slide.title || slide.description || ''}
            fill
            preload={i === 0}
            className="object-contain"
            sizes="(min-width: 768px) calc(100vw - 220px), 100vw"
          />
        </button>
      ))}

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-[linear-gradient(to_top,rgba(0,0,0,0.45)_0%,transparent_50%)] px-6 py-8 sm:px-10">
        <div className="mb-5 flex flex-col gap-1">
          {count > 1 && (
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">
              {pad(index + 1)} / {pad(count)}
            </span>
          )}
          {image.title && <span className="font-serif text-2xl text-white">{image.title}</span>}
        </div>
        {count > 1 && (
          <div className="pointer-events-auto -ml-1.5 flex items-center">
            <button
              type="button"
              onClick={() => setUserPaused((current) => !current)}
              aria-label={userPaused ? 'Play slideshow' : 'Pause slideshow'}
              className="mr-1 px-1.5 text-[10px] leading-none text-white/60 transition-colors hover:text-white/90"
            >
              {userPaused ? '▶' : '❚❚'}
            </button>
            {images.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to photo ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                className="p-1.5"
              >
                <span
                  className={`block size-[5px] rounded-full transition-colors ${
                    i === index ? 'bg-white/90' : 'bg-white/35'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={showPrevious}
            aria-label="Previous"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 p-4 text-[32px] leading-none text-white/50 transition-colors hover:text-white/90"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={showNext}
            aria-label="Next"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 p-4 text-[32px] leading-none text-white/50 transition-colors hover:text-white/90"
          >
            ›
          </button>
        </>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </section>
  );
}
