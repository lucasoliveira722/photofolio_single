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

  it('always renders the about section with contact links', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { level: 1, name: 'Lucas Oliveira' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Email' })).toHaveAttribute('href', 'mailto:you@example.com');
    expect(screen.getByRole('link', { name: 'Instagram' })).toBeInTheDocument();
  });
});
