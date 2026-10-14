import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Lightbox from './Lightbox';
import type { PortfolioImage } from '@/lib/api';

const images: PortfolioImage[] = [
  { id: '1', title: 'First', description: 'First desc', displayOrder: 0, isFeatured: false, width: 800, height: 600, url: 'https://example.com/1.jpg' },
  { id: '2', title: 'Second', description: null, displayOrder: 1, isFeatured: false, width: 800, height: 600, url: 'https://example.com/2.jpg' },
];

describe('Lightbox', () => {
  it('renders the image at the given index', () => {
    render(<Lightbox images={images} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument();
    expect(screen.getByAltText('First')).toHaveAttribute('src', 'https://example.com/1.jpg');
  });

  it('calls onNavigate with the next index when Next is clicked', () => {
    const onNavigate = vi.fn();
    render(<Lightbox images={images} index={0} onClose={vi.fn()} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onNavigate).toHaveBeenCalledWith(1);
  });

  it('disables Previous on the first image and Next on the last image', () => {
    const { rerender } = render(<Lightbox images={images} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    rerender(<Lightbox images={images} index={1} onClose={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('calls onClose when Close is clicked', () => {
    const onClose = vi.fn();
    render(<Lightbox images={images} index={0} onClose={onClose} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<Lightbox images={images} index={0} onClose={onClose} onNavigate={vi.fn()} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when the overlay is clicked, but not when the image is clicked', () => {
    const onClose = vi.fn();
    render(<Lightbox images={images} index={0} onClose={onClose} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByAltText('First'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalled();
  });

  it('falls back to the description for alt text when the title is empty', () => {
    const untitled: PortfolioImage[] = [{ ...images[0], title: '' }];
    render(<Lightbox images={untitled} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByAltText('First desc')).toBeInTheDocument();
  });

  it('moves focus to the Close button when opened', () => {
    render(<Lightbox images={images} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('keeps Tab focus inside the dialog', () => {
    render(<Lightbox images={images} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />);
    const close = screen.getByRole('button', { name: 'Close' });
    const next = screen.getByRole('button', { name: 'Next' });

    // Previous is disabled on the first image, so Next and Close are the first and last stops.
    close.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(next).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(close).toHaveFocus();
  });

  it('locks page scroll while open and restores it on close', () => {
    document.body.style.overflow = 'auto';
    const { unmount } = render(<Lightbox images={images} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />);
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('returns focus to the previously focused element on close', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    const { unmount } = render(<Lightbox images={images} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />);
    unmount();

    expect(opener).toHaveFocus();
    opener.remove();
  });
});
