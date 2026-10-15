import { Suspense } from 'react';
import FeaturedHero from '@/components/FeaturedHero';
import ProfileIntro from '@/components/ProfileIntro';

export default function Home() {
  return (
    <>
      <Suspense fallback={<div className="h-[60dvh] min-h-[360px] w-full bg-ink" />}>
        <FeaturedHero />
      </Suspense>

      <section className="max-w-[600px] px-6 pb-12 pt-24 md:px-[60px]">
        <h1 className="mb-6 text-4xl leading-tight">Lucas Oliveira</h1>
        <Suspense>
          <ProfileIntro />
        </Suspense>
      </section>
    </>
  );
}
