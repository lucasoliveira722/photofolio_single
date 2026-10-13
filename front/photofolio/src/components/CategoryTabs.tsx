import Link from 'next/link';
import type { Category } from '@/lib/api';

type CategoryTabsProps = {
  categories: Category[];
  activeSlug: string;
};

export default function CategoryTabs({ categories, activeSlug }: CategoryTabsProps) {
  return (
    <nav className="flex gap-2 overflow-x-auto" aria-label="Categories">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/portfolio?category=${category.slug}`}
          aria-current={category.slug === activeSlug ? 'page' : undefined}
          className={
            category.slug === activeSlug
              ? 'rounded bg-black px-3 py-1 text-white dark:bg-white dark:text-black'
              : 'rounded px-3 py-1 text-black dark:text-white'
          }
        >
          {category.name}
        </Link>
      ))}
    </nav>
  );
}
