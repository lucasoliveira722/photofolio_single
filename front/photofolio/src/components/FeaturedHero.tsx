import HeroCarousel from './HeroCarousel';
import { getFeaturedImages } from '@/lib/api';

export default async function FeaturedHero() {
  let featuredImages: Awaited<ReturnType<typeof getFeaturedImages>> = [];
  let loadError = false;

  try {
    featuredImages = await getFeaturedImages();
  } catch {
    loadError = true;
  }

  if (loadError) {
    return <p className="text-red-600">Couldn&apos;t load photos right now.</p>;
  }

  return <HeroCarousel images={featuredImages} />;
}
