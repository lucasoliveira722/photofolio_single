import { describe, it, expect } from 'vitest';
import { parseArgs, titleFromFilename, buildSeedRows, nextCategoryOrder } from '../scripts/seedPlan.js';

describe('parseArgs', () => {
  it('parses --key=value pairs', () => {
    expect(parseArgs(['--category=weddings', '--dir=./photos'])).toEqual({
      category: 'weddings',
      dir: './photos',
    });
  });

  it('ignores malformed args', () => {
    expect(parseArgs(['notanarg'])).toEqual({});
  });
});

describe('titleFromFilename', () => {
  it('strips the extension and title-cases separators', () => {
    expect(titleFromFilename('golden-hour_pier.jpg')).toBe('Golden Hour Pier');
  });
});

describe('buildSeedRows', () => {
  it('builds rows with sequential display order and prefixed storage paths', () => {
    const rows = buildSeedRows('weddings', [
      { filename: 'a.jpg', width: 800, height: 600 },
      { filename: 'b.jpg', width: 1024, height: 768 },
    ]);

    expect(rows).toEqual([
      { storagePath: 'weddings/a.jpg', title: 'A', width: 800, height: 600, displayOrder: 0 },
      { storagePath: 'weddings/b.jpg', title: 'B', width: 1024, height: 768, displayOrder: 1 },
    ]);
  });

  it('skips files already seeded and continues display order after existing images', () => {
    const rows = buildSeedRows(
      'weddings',
      [
        { filename: 'a.jpg', width: 800, height: 600 },
        { filename: 'c.jpg', width: 640, height: 480 },
      ],
      { existingPaths: ['weddings/a.jpg', 'weddings/b.jpg'] }
    );

    expect(rows).toEqual([
      { storagePath: 'weddings/c.jpg', title: 'C', width: 640, height: 480, displayOrder: 2 },
    ]);
  });
});

describe('nextCategoryOrder', () => {
  it('returns 0 when there are no categories', () => {
    expect(nextCategoryOrder([])).toBe(0);
  });

  it('returns one past the highest existing display order', () => {
    expect(nextCategoryOrder([0, 3, 1])).toBe(4);
  });
});
