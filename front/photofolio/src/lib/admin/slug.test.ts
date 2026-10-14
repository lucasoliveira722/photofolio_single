import { describe, it, expect } from 'vitest';
import { slugify, uniqueSlug } from './slug';

describe('slugify', () => {
  it('lowercases and joins words with dashes', () => {
    expect(slugify('Weddings and Events')).toBe('weddings-and-events');
  });

  it('strips accents', () => {
    expect(slugify('São Paulo')).toBe('sao-paulo');
  });

  it('collapses symbols and trims dashes', () => {
    expect(slugify('  B&W -- Street!  ')).toBe('b-w-street');
  });

  it('falls back to "category" when nothing usable is left', () => {
    expect(slugify('!!!')).toBe('category');
  });
});

describe('uniqueSlug', () => {
  it('keeps a free slug', () => {
    expect(uniqueSlug('weddings', ['portraits'])).toBe('weddings');
  });

  it('appends the first free number', () => {
    expect(uniqueSlug('weddings', ['weddings', 'weddings-2'])).toBe('weddings-3');
  });
});
