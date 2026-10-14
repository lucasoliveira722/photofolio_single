import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const navigation = vi.hoisted(() => ({ pathname: '/portfolio' }));
vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname }));

import SiteNav from './SiteNav';

describe('SiteNav', () => {
  it('links the site name home and links to the portfolio and prints pages', () => {
    render(<SiteNav />);
    expect(screen.getByRole('link', { name: 'Lucas Oliveira Fotografia' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Portfolio' })).toHaveAttribute('href', '/portfolio');
    expect(screen.getByRole('link', { name: 'Prints' })).toHaveAttribute('href', '/sale');
  });

  it('marks the link for the current page with aria-current', () => {
    render(<SiteNav />);
    expect(screen.getByRole('link', { name: 'Portfolio' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Prints' })).not.toHaveAttribute('aria-current');
  });

  it('toggles the mobile menu and closes it with Escape', () => {
    render(<SiteNav />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the mobile menu when the backdrop is clicked', () => {
    const { container } = render(<SiteNav />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(container.querySelector('[aria-hidden="true"]')!);
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the mobile menu when the path changes some other way, e.g. Back', () => {
    const { rerender } = render(<SiteNav />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    navigation.pathname = '/sale';
    rerender(<SiteNav />);
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
    navigation.pathname = '/portfolio';
  });

  it('closes the mobile menu when a link is followed', () => {
    render(<SiteNav />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(screen.getByRole('link', { name: 'Prints' }));
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
  });
});
