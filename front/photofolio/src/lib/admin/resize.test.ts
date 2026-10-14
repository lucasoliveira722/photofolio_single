import { describe, it, expect } from 'vitest';
import { fitWithin, MAX_EDGE } from './resize';

describe('fitWithin', () => {
  it('scales a landscape image so its width is the max edge', () => {
    expect(fitWithin(6000, 4000)).toEqual({ width: MAX_EDGE, height: 1707 });
  });

  it('scales a portrait image so its height is the max edge', () => {
    expect(fitWithin(4000, 6000)).toEqual({ width: 1707, height: MAX_EDGE });
  });

  it('never upscales a small image', () => {
    expect(fitWithin(1200, 800)).toEqual({ width: 1200, height: 800 });
  });
});
