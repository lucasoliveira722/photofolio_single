import { describe, it, expect } from 'vitest';
import { bioParagraphs, isValidEmail, normalizeInstagram } from './profile';

describe('normalizeInstagram', () => {
  it.each([
    ['lucas.foto', 'lucas.foto'],
    ['  @lucas_foto  ', 'lucas_foto'],
    ['https://www.instagram.com/lucas.foto/', 'lucas.foto'],
    ['instagram.com/lucas.foto?igsh=abc', 'lucas.foto'],
    ['', ''],
  ])('turns %j into %j', (input, handle) => {
    expect(normalizeInstagram(input)).toBe(handle);
  });

  it('rejects text that is not a handle', () => {
    expect(normalizeInstagram('lucas foto')).toBeNull();
    expect(normalizeInstagram('https://example.com/lucas')).toBeNull();
  });
});

describe('isValidEmail', () => {
  it('accepts an address and rejects anything else', () => {
    expect(isValidEmail('lucas@example.com')).toBe(true);
    expect(isValidEmail('lucas@example')).toBe(false);
    expect(isValidEmail('lucas example.com')).toBe(false);
  });
});

describe('bioParagraphs', () => {
  it('splits on blank lines and drops empty paragraphs', () => {
    expect(bioParagraphs('Olá.\nSou fotógrafo.\n\n\n  Veja o portfólio.  \n')).toEqual([
      'Olá.\nSou fotógrafo.',
      'Veja o portfólio.',
    ]);
    expect(bioParagraphs('  ')).toEqual([]);
  });
});
