import HeroCarousel from './HeroCarousel';
import { getFeaturedImages } from '@/lib/api';

export default async function FeaturedHero() {
  try {
    const featuredImages = await getFeaturedImages();
    return <HeroCarousel images={featuredImages} />;
  } catch {
    return <p className="text-red-600">Couldn&apos;t load photos right now.</p>;
  }
}
