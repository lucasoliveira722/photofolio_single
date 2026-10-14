import { Suspense } from 'react';
import FeaturedHero from '@/components/FeaturedHero';

const contactLinkClass = 'text-[10px] uppercase tracking-[0.18em] text-muted transition-colors hover:text-ink';

export default function Home() {
  return (
    <>
      <Suspense fallback={<div className="h-[60dvh] min-h-[360px] w-full bg-ink" />}>
        <FeaturedHero />
      </Suspense>

      <section className="max-w-[600px] px-6 pb-12 pt-24 md:px-[60px]">
        <h1 className="mb-6 text-4xl leading-tight">Lucas Oliveira</h1>
        <p className="leading-[1.8] text-muted">
          I&apos;m a photographer capturing light, moments, and the in-between. Explore the
          portfolio to see my work across different categories.
        </p>
        <div className="mt-10 flex gap-6">
          <a href="mailto:you@example.com" className={contactLinkClass}>Email</a>
          <a href="https://instagram.com/yourhandle" className={contactLinkClass}>Instagram</a>
        </div>
      </section>
    </>
  );
}
