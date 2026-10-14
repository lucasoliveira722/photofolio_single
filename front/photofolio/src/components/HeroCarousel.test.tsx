import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import HeroCarousel from './HeroCarousel';
import type { PortfolioImage } from '@/lib/api';

const images: PortfolioImage[] = [
  { id: '1', title: 'First', description: null, displayOrder: 0, isFeatured: true, width: 1600, height: 900, url: 'https://example.com/1.jpg' },
  { id: '2', title: 'Second', description: null, displayOrder: 1, isFeatured: true, width: 1600, height: 900, url: 'https://example.com/2.jpg' },
];

describe('HeroCarousel', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows the first image initially', () => {
    render(<HeroCarousel images={images} />);
    expect(screen.getByAltText('First')).toBeInTheDocument();
    expect(screen.getByText('01 / 02')).toBeInTheDocument();
  });

  it('advances to the next image on Next click', () => {
    render(<HeroCarousel images={images} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('02 / 02')).toBeInTheDocument();
  });

  it('wraps around to the last image when Previous is clicked on the first image', () => {
    render(<HeroCarousel images={images} />);
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByText('02 / 02')).toBeInTheDocument();
  });

  it('jumps to a photo when its dot is clicked', () => {
    render(<HeroCarousel images={images} />);
    fireEvent.click(screen.getByRole('button', { name: 'Go to photo 2' }));
    expect(screen.getByText('02 / 02')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to photo 2' })).toHaveAttribute('aria-current', 'true');
  });

  it('auto-advances every 5 seconds', () => {
    vi.useFakeTimers();
    render(<HeroCarousel images={images} />);

    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText('02 / 02')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText('01 / 02')).toBeInTheDocument();
  });

  it('pauses auto-advance while hovered', () => {
    vi.useFakeTimers();
    render(<HeroCarousel images={images} />);
    const carousel = screen.getByRole('region', { name: 'Featured photos' });

    fireEvent.mouseEnter(carousel);
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByText('01 / 02')).toBeInTheDocument();

    fireEvent.mouseLeave(carousel);
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText('02 / 02')).toBeInTheDocument();
  });

  it('stays paused while focus is inside, even after the mouse leaves', () => {
    vi.useFakeTimers();
    render(<HeroCarousel images={images} />);
    const carousel = screen.getByRole('region', { name: 'Featured photos' });

    fireEvent.mouseEnter(carousel);
    fireEvent.focus(screen.getByRole('button', { name: 'Next' }));
    fireEvent.mouseLeave(carousel);
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByText('01 / 02')).toBeInTheDocument();
  });

  it('can be paused and resumed with the pause button', () => {
    vi.useFakeTimers();
    render(<HeroCarousel images={images} />);

    fireEvent.click(screen.getByRole('button', { name: 'Pause slideshow' }));
    // Clicking focuses the button; blur so only the user pause is in effect.
    fireEvent.blur(screen.getByRole('button', { name: 'Play slideshow' }));
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByText('01 / 02')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Play slideshow' }));
    fireEvent.blur(screen.getByRole('button', { name: 'Pause slideshow' }));
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText('02 / 02')).toBeInTheDocument();
  });

  it('makes inactive slides inert and hidden from assistive tech', () => {
    render(<HeroCarousel images={images} />);
    const inactive = screen.getByAltText('Second').closest('button');
    expect(inactive).toHaveAttribute('inert');
    expect(inactive).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByAltText('First').closest('button')).not.toHaveAttribute('inert');
  });

  it('does not auto-advance when the user prefers reduced motion', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }));
    render(<HeroCarousel images={images} />);

    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByText('01 / 02')).toBeInTheDocument();
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
