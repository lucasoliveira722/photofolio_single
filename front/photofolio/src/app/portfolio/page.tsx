import { Suspense } from 'react';
import PortfolioGallery from '@/components/PortfolioGallery';

type PortfolioPageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default function PortfolioPage({ searchParams }: PortfolioPageProps) {
  return (
    <div className="px-4 pb-10 pt-20 sm:px-6 md:p-10">
      <h1 className="text-4xl leading-tight">Portfolio</h1>

      <Suspense fallback={<p className="mt-6 text-muted">Loading photos…</p>}>
        <PortfolioGallery searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
