import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HeroCarousel from './HeroCarousel';
import type { PortfolioImage } from '@/lib/api';

const images: PortfolioImage[] = [
  { id: '1', title: 'First', description: null, displayOrder: 0, isFeatured: true, width: 1600, height: 900, url: 'https://example.com/1.jpg' },
  { id: '2', title: 'Second', description: null, displayOrder: 1, isFeatured: true, width: 1600, height: 900, url: 'https://example.com/2.jpg' },
];

describe('HeroCarousel', () => {
  it('shows the first image initially', () => {
    render(<HeroCarousel images={images} />);
    expect(screen.getByAltText('First')).toBeInTheDocument();
  });

  it('advances to the next image on Next click', () => {
    render(<HeroCarousel images={images} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByAltText('Second')).toBeInTheDocument();
  });

  it('wraps around to the last image when Previous is clicked on the first image', () => {
    render(<HeroCarousel images={images} />);
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByAltText('Second')).toBeInTheDocument();
  });

  it('renders nothing when there are no images', () => {
    const { container } = render(<HeroCarousel images={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('hides navigation controls when there is only one image', () => {
    render(<HeroCarousel images={[images[0]]} />);
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });

  it('opens the lightbox on the current image when the hero image is clicked', () => {
    render(<HeroCarousel images={images} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByAltText('Second'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Second' })).toBeInTheDocument();
  });

  it('falls back to the description for alt text when the title is empty', () => {
    render(<HeroCarousel images={[{ ...images[0], title: '', description: 'A described photo' }]} />);
    expect(screen.getByAltText('A described photo')).toBeInTheDocument();
  });
});
