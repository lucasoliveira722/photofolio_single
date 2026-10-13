import { Suspense } from 'react';
import Link from 'next/link';
import FeaturedHero from '@/components/FeaturedHero';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <header className="flex w-full max-w-5xl items-center justify-between">
        <h1 className="text-xl font-semibold text-black dark:text-white">Your Name Photography</h1>
        <nav className="flex gap-4 text-black dark:text-white">
          <Link href="/portfolio">Portfolio</Link>
          <Link href="/sale">Prints</Link>
        </nav>
      </header>

      <main className="mt-10 flex w-full max-w-5xl flex-col items-center gap-10">
        <Suspense fallback={<div className="aspect-video w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />}>
          <FeaturedHero />
        </Suspense>

        <section className="max-w-2xl text-center text-black dark:text-white">
          <h2 className="text-lg font-semibold">About</h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            I&apos;m a photographer capturing light, moments, and the in-between. Explore the
            portfolio to see my work across different categories.
          </p>
        </section>

        <section className="flex gap-4 text-black dark:text-white">
          <a href="mailto:you@example.com">Email</a>
          <a href="https://instagram.com/yourhandle">Instagram</a>
        </section>
      </main>
    </div>
  );
}
