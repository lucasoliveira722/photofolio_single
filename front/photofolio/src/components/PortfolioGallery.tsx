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
  let activeSlug = category || '';
  let loadError = false;
  let categoryNotFound = false;

  try {
    categories = await getCategories();
    activeSlug = category || categories[0]?.slug || '';
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
    return <p className="mt-6 text-muted">Couldn&apos;t load photos right now.</p>;
  }

  return (
    <>
      <div className="mt-8">
        <CategoryTabs categories={categories} activeSlug={activeSlug} />
      </div>
      <div className="mt-8">
        {categoryNotFound ? (
          <p className="text-muted">Category not found. Pick one of the categories above.</p>
        ) : (
          <ImageGrid images={images} />
        )}
      </div>
    </>
  );
}
