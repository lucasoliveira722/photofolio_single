import { describe, it, expect } from 'vitest';
import { moveId } from './reorder';

describe('moveId', () => {
  it('moves an id forward', () => {
    expect(moveId(['a', 'b', 'c', 'd'], 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves an id backward', () => {
    expect(moveId(['a', 'b', 'c', 'd'], 'd', 'b')).toEqual(['a', 'd', 'b', 'c']);
  });

  it('returns the same list when the id is dropped on itself or is unknown', () => {
    const ids = ['a', 'b'];
    expect(moveId(ids, 'a', 'a')).toBe(ids);
    expect(moveId(ids, 'x', 'a')).toBe(ids);
  });
});
