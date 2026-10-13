import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/api', () => ({
  getCategories: vi.fn(),
  getCategoryImages: vi.fn(),
}));

import PortfolioGallery from './PortfolioGallery';
import { getCategories, getCategoryImages } from '@/lib/api';

const categories = [
  { id: '1', slug: 'weddings', name: 'Weddings', displayOrder: 0 },
  { id: '2', slug: 'portraits', name: 'Portraits', displayOrder: 1 },
];

describe('PortfolioGallery', () => {
  it('defaults to the first category when none is specified', async () => {
    (getCategories as ReturnType<typeof vi.fn>).mockResolvedValue(categories);
    (getCategoryImages as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    render(await PortfolioGallery({ searchParams: Promise.resolve({}) }));

    expect(getCategoryImages).toHaveBeenCalledWith('weddings');
    expect(screen.getByRole('link', { name: 'Weddings' })).toHaveAttribute('aria-current', 'page');
  });

  it('fetches the requested category when a category param is given', async () => {
    (getCategories as ReturnType<typeof vi.fn>).mockResolvedValue(categories);
    (getCategoryImages as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    render(await PortfolioGallery({ searchParams: Promise.resolve({ category: 'portraits' }) }));

    expect(getCategoryImages).toHaveBeenCalledWith('portraits');
  });

  it('renders the image grid with the fetched images', async () => {
    (getCategories as ReturnType<typeof vi.fn>).mockResolvedValue(categories);
    (getCategoryImages as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'img-1', title: 'Wedding Photo', description: null, displayOrder: 0, isFeatured: false, width: 800, height: 600, url: 'https://example.com/1.jpg' },
    ]);

    render(await PortfolioGallery({ searchParams: Promise.resolve({}) }));

    expect(screen.getByAltText('Wedding Photo')).toBeInTheDocument();
  });

  it('shows an error message when categories fail to load', async () => {
    (getCategories as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network error'));

    render(await PortfolioGallery({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText(/couldn.t load photos/i)).toBeInTheDocument();
  });
});
