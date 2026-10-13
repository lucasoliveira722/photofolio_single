import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ImageGrid from './ImageGrid';
import type { PortfolioImage } from '@/lib/api';

const images: PortfolioImage[] = [
  { id: '1', title: 'First', description: null, displayOrder: 0, isFeatured: false, width: 800, height: 600, url: 'https://example.com/1.jpg' },
  { id: '2', title: 'Second', description: null, displayOrder: 1, isFeatured: false, width: 800, height: 600, url: 'https://example.com/2.jpg' },
];

describe('ImageGrid', () => {
  it('renders one thumbnail per image', () => {
    render(<ImageGrid images={images} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('opens the lightbox at the clicked image index', () => {
    render(<ImageGrid images={images} />);
    fireEvent.click(screen.getByAltText('Second'));
    expect(screen.getByRole('heading', { name: 'Second' })).toBeInTheDocument();
  });

  it('does not render the lightbox before any thumbnail is clicked', () => {
    render(<ImageGrid images={images} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('falls back to the description for thumbnail alt text when the title is empty', () => {
    render(<ImageGrid images={[{ ...images[0], title: '', description: 'A described photo' }]} />);
    expect(screen.getByAltText('A described photo')).toBeInTheDocument();
  });
});
