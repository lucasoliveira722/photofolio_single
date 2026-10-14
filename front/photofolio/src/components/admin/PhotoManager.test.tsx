import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AdminCategory, AdminImage } from '@/lib/admin/types';

vi.mock('@/app/(admin)/admin/actions', () => ({
  setFeatured: vi.fn(),
  reorderImages: vi.fn(),
  updateImage: vi.fn(),
  deleteImage: vi.fn(),
}));
vi.mock('./UploadQueue', () => ({ default: () => <div data-testid="upload-queue" /> }));

import PhotoManager from './PhotoManager';
import { setFeatured } from '@/app/(admin)/admin/actions';

const category: AdminCategory = { id: 'c1', slug: 'weddings', name: 'Weddings', displayOrder: 0, photoCount: 2 };
const images: AdminImage[] = [
  { id: 'i1', categoryId: 'c1', storagePath: 'photos/1.jpg', title: 'First', description: null, displayOrder: 0, isFeatured: false, width: 800, height: 600, url: 'https://example.com/1.jpg' },
  { id: 'i2', categoryId: 'c1', storagePath: 'photos/2.jpg', title: 'Second', description: 'Desc', displayOrder: 1, isFeatured: true, width: 800, height: 600, url: 'https://example.com/2.jpg' },
];

describe('PhotoManager', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the category name and a card per photo', () => {
    render(<PhotoManager category={category} categories={[category]} images={images} />);
    expect(screen.getByRole('heading', { name: 'Weddings' })).toBeInTheDocument();
    expect(screen.getByAltText('First')).toBeInTheDocument();
    expect(screen.getByAltText('Second')).toBeInTheDocument();
  });

  it('shows an empty state', () => {
    render(<PhotoManager category={category} categories={[category]} images={[]} />);
    expect(screen.getByText('No photos in this category yet.')).toBeInTheDocument();
  });

  it('toggles featured immediately', async () => {
    vi.mocked(setFeatured).mockResolvedValue({ ok: true });
    render(<PhotoManager category={category} categories={[category]} images={images} />);

    const star = screen.getByRole('button', { name: 'Featured: First' });
    expect(star).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(star);

    expect(star).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(setFeatured).toHaveBeenCalledWith('i1', true));
  });

  it('rolls the featured toggle back and explains when saving fails', async () => {
    vi.mocked(setFeatured).mockResolvedValue({ ok: false, error: "Couldn't update the photo: denied" });
    render(<PhotoManager category={category} categories={[category]} images={images} />);

    fireEvent.click(screen.getByRole('button', { name: 'Featured: Second' }));

    expect(await screen.findByText("Couldn't update the photo: denied")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Featured: Second' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens the edit panel for a photo', () => {
    render(<PhotoManager category={category} categories={[category]} images={images} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Second' }));
    expect(screen.getByRole('dialog', { name: 'Edit photo' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Second');
  });

  it('uses stable drag-and-drop ids so server and browser HTML match', () => {
    render(<PhotoManager category={category} categories={[category]} images={images} />);
    expect(screen.getByRole('button', { name: 'Reorder First' })).toHaveAttribute(
      'aria-describedby',
      'photo-grid'
    );
  });
});
