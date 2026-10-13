import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CategoryTabs from './CategoryTabs';
import type { Category } from '@/lib/api';

const categories: Category[] = [
  { id: '1', slug: 'weddings', name: 'Weddings', displayOrder: 0 },
  { id: '2', slug: 'portraits', name: 'Portraits', displayOrder: 1 },
];

describe('CategoryTabs', () => {
  it('renders a link per category pointing at the category query param', () => {
    render(<CategoryTabs categories={categories} activeSlug="weddings" />);
    expect(screen.getByRole('link', { name: 'Weddings' })).toHaveAttribute('href', '/portfolio?category=weddings');
    expect(screen.getByRole('link', { name: 'Portraits' })).toHaveAttribute('href', '/portfolio?category=portraits');
  });

  it('marks the active category link with aria-current', () => {
    render(<CategoryTabs categories={categories} activeSlug="portraits" />);
    expect(screen.getByRole('link', { name: 'Portraits' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Weddings' })).not.toHaveAttribute('aria-current');
  });
});
