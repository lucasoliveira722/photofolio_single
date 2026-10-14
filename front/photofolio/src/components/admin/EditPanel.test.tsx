import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AdminCategory, AdminImage } from '@/lib/admin/types';

vi.mock('@/app/(admin)/admin/actions', () => ({ updateImage: vi.fn(), deleteImage: vi.fn() }));

import EditPanel from './EditPanel';
import { updateImage, deleteImage } from '@/app/(admin)/admin/actions';

const categories: AdminCategory[] = [
  { id: 'c1', slug: 'weddings', name: 'Weddings', displayOrder: 0, photoCount: 1 },
  { id: 'c2', slug: 'portraits', name: 'Portraits', displayOrder: 1, photoCount: 0 },
];
const image: AdminImage = {
  id: 'i1', categoryId: 'c1', storagePath: 'photos/1.jpg', title: 'Dunes', description: 'Sand at dusk',
  displayOrder: 0, isFeatured: false, width: 800, height: 600, url: 'https://example.com/1.jpg',
};

describe('EditPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is prefilled with the photo', () => {
    render(<EditPanel image={image} categories={categories} onClose={vi.fn()} />);
    expect(screen.getByLabelText('Title')).toHaveValue('Dunes');
    expect(screen.getByLabelText('Description')).toHaveValue('Sand at dusk');
    expect(screen.getByLabelText('Category')).toHaveValue('c1');
  });

  it('saves title, description, and a new category, then closes', async () => {
    vi.mocked(updateImage).mockResolvedValue({ ok: true });
    const onClose = vi.fn();
    render(<EditPanel image={image} categories={categories} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Dunes II' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'c2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(updateImage).toHaveBeenCalledWith('i1', { title: 'Dunes II', description: 'Sand at dusk', categoryId: 'c2' });
  });

  it('keeps the panel open with the typed values when saving fails', async () => {
    vi.mocked(updateImage).mockResolvedValue({ ok: false, error: 'Title is required.' });
    const onClose = vi.fn();
    render(<EditPanel image={image} categories={categories} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'New text' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Title is required.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Description')).toHaveValue('New text');
  });

  it('deletes only after confirmation', async () => {
    vi.mocked(deleteImage).mockResolvedValue({ ok: true });
    const onClose = vi.fn();
    render(<EditPanel image={image} categories={categories} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete photo' }));
    expect(screen.getByText("Delete this photo? This can't be undone.")).toBeInTheDocument();
    expect(deleteImage).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(deleteImage).toHaveBeenCalledWith('i1');
  });

  it('closes with Escape', () => {
    const onClose = vi.fn();
    render(<EditPanel image={image} categories={categories} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
