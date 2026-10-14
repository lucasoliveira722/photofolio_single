import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AdminCategory } from '@/lib/admin/types';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/app/(admin)/admin/actions', () => ({
  createCategory: vi.fn(),
  renameCategory: vi.fn(),
  deleteCategory: vi.fn(),
  reorderCategories: vi.fn(),
}));

import CategoryList from './CategoryList';
import { createCategory, renameCategory, deleteCategory } from '@/app/(admin)/admin/actions';

const categories: AdminCategory[] = [
  { id: 'c1', slug: 'weddings', name: 'Weddings', displayOrder: 0, photoCount: 12 },
  { id: 'c2', slug: 'portraits', name: 'Portraits', displayOrder: 1, photoCount: 0 },
];

describe('CategoryList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists categories with photo counts and marks the active one', () => {
    render(<CategoryList categories={categories} activeSlug="weddings" />);
    expect(screen.getByRole('link', { name: /Weddings/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Weddings/ })).toHaveAttribute('href', '/admin?category=weddings');
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('creates a category and opens it', async () => {
    vi.mocked(createCategory).mockResolvedValue({ ok: true, slug: 'travel' });
    render(<CategoryList categories={categories} activeSlug="weddings" />);

    fireEvent.change(screen.getByLabelText('New category'), { target: { value: 'Travel' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin?category=travel'));
    expect(createCategory).toHaveBeenCalledWith('Travel');
    expect(screen.getByLabelText('New category')).toHaveValue('');
  });

  it('shows the error and a sign-in link when the session expired', async () => {
    vi.mocked(createCategory).mockResolvedValue({ ok: false, error: 'Your session expired. Sign in again.', signedOut: true });
    render(<CategoryList categories={categories} activeSlug="weddings" />);

    fireEvent.change(screen.getByLabelText('New category'), { target: { value: 'Travel' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Your session expired. Sign in again.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('renames inline and cancels with Escape', async () => {
    vi.mocked(renameCategory).mockResolvedValue({ ok: true });
    render(<CategoryList categories={categories} activeSlug="weddings" />);

    fireEvent.click(screen.getByRole('button', { name: 'Rename Portraits' }));
    fireEvent.keyDown(screen.getByLabelText('Category name'), { key: 'Escape' });
    expect(screen.queryByLabelText('Category name')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Rename Portraits' }));
    fireEvent.change(screen.getByLabelText('Category name'), { target: { value: 'People' } });
    fireEvent.submit(screen.getByLabelText('Category name').closest('form')!);

    await waitFor(() => expect(renameCategory).toHaveBeenCalledWith('c2', 'People'));
  });

  it('asks before deleting and states how many photos go with it', async () => {
    vi.mocked(deleteCategory).mockResolvedValue({ ok: true });
    render(<CategoryList categories={categories} activeSlug="portraits" />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Weddings' }));
    expect(screen.getByText('Delete Weddings and its 12 photos?')).toBeInTheDocument();
    expect(deleteCategory).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await waitFor(() => expect(deleteCategory).toHaveBeenCalledWith('c1'));
    expect(push).not.toHaveBeenCalled();
  });

  it('goes back to the first category after deleting the active category', async () => {
    vi.mocked(deleteCategory).mockResolvedValue({ ok: true });
    render(<CategoryList categories={categories} activeSlug="portraits" />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Portraits' }));
    expect(screen.getByText('Delete Portraits?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin'));
  });
});
