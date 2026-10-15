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

  it('focuses the title on open and returns focus to where it was on close', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    const { unmount } = render(<EditPanel image={image} categories={categories} onClose={vi.fn()} />);
    expect(screen.getByLabelText('Title')).toHaveFocus();

    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it('keeps Tab and Shift+Tab inside the panel', () => {
    render(<EditPanel image={image} categories={categories} onClose={vi.fn()} />);
    const close = screen.getByRole('button', { name: 'Close' });
    const last = screen.getByRole('button', { name: 'Delete photo' });

    last.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(close).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('closes on a click on the backdrop', () => {
    const onClose = vi.fn();
    render(<EditPanel image={image} categories={categories} onClose={onClose} />);
    const backdrop = screen.getByRole('dialog').parentElement!;

    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('stays open when a text selection inside the panel ends on the backdrop', () => {
    const onClose = vi.fn();
    render(<EditPanel image={image} categories={categories} onClose={onClose} />);
    const backdrop = screen.getByRole('dialog').parentElement!;

    fireEvent.mouseDown(screen.getByLabelText('Description'));
    fireEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('reports a deleted photo and leaves focus to the photo grid', async () => {
    vi.mocked(deleteImage).mockResolvedValue({ ok: true });
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const onClose = vi.fn();
    const { unmount } = render(<EditPanel image={image} categories={categories} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete photo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledWith({ message: 'Dunes deleted.' }));

    unmount();
    expect(opener).not.toHaveFocus();
    opener.remove();
  });

  it('reports a photo moved to another category', async () => {
    vi.mocked(updateImage).mockResolvedValue({ ok: true });
    const onClose = vi.fn();
    render(<EditPanel image={image} categories={categories} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'c2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledWith({ message: 'Dunes moved to Portraits.' }));
  });

  it('closes without a report when the photo stays in its category', async () => {
    vi.mocked(updateImage).mockResolvedValue({ ok: true });
    const onClose = vi.fn();
    render(<EditPanel image={image} categories={categories} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledWith());
  });
});

