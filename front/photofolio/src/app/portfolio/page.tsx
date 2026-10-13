import { Suspense } from 'react';
import PortfolioGallery from '@/components/PortfolioGallery';
import SiteHeader from '@/components/SiteHeader';

type PortfolioPageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default function PortfolioPage({ searchParams }: PortfolioPageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <SiteHeader />
      <div className="mt-10 w-full max-w-5xl">
        <h1 className="text-2xl font-semibold text-black dark:text-white">Portfolio</h1>

        <Suspense fallback={<p className="mt-6 text-zinc-500">Loading photos…</p>}>
          <PortfolioGallery searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
