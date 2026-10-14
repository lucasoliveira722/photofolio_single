import Link from 'next/link';
import type { Category } from '@/lib/api';

type CategoryTabsProps = {
  categories: Category[];
  activeSlug: string;
};

export default function CategoryTabs({ categories, activeSlug }: CategoryTabsProps) {
  return (
    <nav className="flex gap-6 overflow-x-auto" aria-label="Categories">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/portfolio?category=${category.slug}`}
          aria-current={category.slug === activeSlug ? 'page' : undefined}
          className={`shrink-0 py-1.5 text-[10px] uppercase tracking-[0.18em] transition-colors hover:text-ink ${
            category.slug === activeSlug ? 'text-ink' : 'text-muted'
          }`}
        >
          {category.name}
        </Link>
      ))}
    </nav>
  );
}
