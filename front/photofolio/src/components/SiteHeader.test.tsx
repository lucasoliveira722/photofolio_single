import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SiteHeader from './SiteHeader';

describe('SiteHeader', () => {
  it('links the site name home and links to the portfolio and prints pages', () => {
    render(<SiteHeader />);
    expect(screen.getByRole('link', { name: 'Your Name Photography' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Portfolio' })).toHaveAttribute('href', '/portfolio');
    expect(screen.getByRole('link', { name: 'Prints' })).toHaveAttribute('href', '/sale');
  });

  it('renders the site name as the page heading only when asked', () => {
    const { rerender } = render(<SiteHeader />);
    expect(screen.queryByRole('heading', { name: 'Your Name Photography' })).not.toBeInTheDocument();

    rerender(<SiteHeader titleAs="h1" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Your Name Photography' })).toBeInTheDocument();
  });
});
