import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/PortfolioGallery', () => ({
  default: () => <div data-testid="portfolio-gallery" />,
}));

import PortfolioPage from './page';

describe('Portfolio page', () => {
  it('renders the heading and the gallery section', () => {
    render(<PortfolioPage searchParams={Promise.resolve({})} />);

    expect(screen.getByRole('heading', { name: 'Portfolio' })).toBeInTheDocument();
    expect(screen.getByTestId('portfolio-gallery')).toBeInTheDocument();
  });
});
