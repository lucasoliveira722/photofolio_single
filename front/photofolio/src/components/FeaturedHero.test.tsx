import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/server', () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/api', () => ({
  getFeaturedImages: vi.fn(),
}));

import FeaturedHero from './FeaturedHero';
import { getFeaturedImages } from '@/lib/api';

describe('FeaturedHero', () => {
  it('renders the hero carousel with featured images', async () => {
    (getFeaturedImages as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: '1', title: 'Hero', description: null, displayOrder: 0, isFeatured: true, width: 1600, height: 900, url: 'https://example.com/hero.jpg' },
    ]);

    render(await FeaturedHero());

    expect(screen.getByAltText('Hero')).toBeInTheDocument();
  });

  it('shows an error message when featured images fail to load', async () => {
    (getFeaturedImages as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network error'));

    render(await FeaturedHero());

    expect(screen.getByText(/couldn.t load photos/i)).toBeInTheDocument();
  });
});
