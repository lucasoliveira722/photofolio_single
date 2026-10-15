import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/FeaturedHero', () => ({
  default: () => <div data-testid="featured-hero" />,
}));

vi.mock('@/components/ProfileIntro', () => ({
  default: () => <div data-testid="profile-intro" />,
}));

import Home from './page';

describe('Home page', () => {
  it('renders the featured hero section', () => {
    render(<Home />);

    expect(screen.getByTestId('featured-hero')).toBeInTheDocument();
  });

  it('always renders the about section with the editable profile', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { level: 1, name: 'Lucas Oliveira' })).toBeInTheDocument();
    expect(screen.getByTestId('profile-intro')).toBeInTheDocument();
  });
});
