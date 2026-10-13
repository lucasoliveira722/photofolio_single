import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/FeaturedHero', () => ({
  default: () => <div data-testid="featured-hero" />,
}));

import Home from './page';

describe('Home page', () => {
  it('renders the featured hero section', () => {
    render(<Home />);

    expect(screen.getByTestId('featured-hero')).toBeInTheDocument();
  });

  it('always renders the about section and navigation', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Portfolio' })).toHaveAttribute('href', '/portfolio');
  });
});
