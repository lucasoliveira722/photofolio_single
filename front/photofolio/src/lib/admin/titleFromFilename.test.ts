import { describe, it, expect } from 'vitest';
import { titleFromFilename } from './titleFromFilename';

describe('titleFromFilename', () => {
  it('drops the extension', () => {
    expect(titleFromFilename('IMG_9495.jpg')).toBe('IMG_9495');
  });

  it('drops only the last extension', () => {
    expect(titleFromFilename('beach.final.jpeg')).toBe('beach.final');
  });

  it('uses Untitled when nothing is left', () => {
    expect(titleFromFilename('.jpg')).toBe('Untitled');
  });
});
