import CategoryTabs from './CategoryTabs';
import ImageGrid from './ImageGrid';
import { ApiError, getCategories, getCategoryImages } from '@/lib/api';

type PortfolioGalleryProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function PortfolioGallery({ searchParams }: PortfolioGalleryProps) {
  const { category } = await searchParams;

  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let images: Awaited<ReturnType<typeof getCategoryImages>> = [];
  let activeSlug = category ?? '';
  let loadError = false;
  let categoryNotFound = false;

  try {
    categories = await getCategories();
    activeSlug = category ?? categories[0]?.slug ?? '';
    if (activeSlug) {
      images = await getCategoryImages(activeSlug);
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      categoryNotFound = true;
    } else {
      loadError = true;
    }
  }

  if (loadError) {
    return <p className="mt-4 text-red-600">Couldn&apos;t load photos right now.</p>;
  }

  return (
    <>
      <div className="mt-6">
        <CategoryTabs categories={categories} activeSlug={activeSlug} />
      </div>
      <div className="mt-6">
        {categoryNotFound ? (
          <p className="text-zinc-600 dark:text-zinc-400">Category not found. Pick one of the categories above.</p>
        ) : (
          <ImageGrid images={images} />
        )}
      </div>
    </>
  );
}
