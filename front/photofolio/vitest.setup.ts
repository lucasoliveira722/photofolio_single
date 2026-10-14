import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import React from 'react';
import type { ImageProps } from 'next/image';

afterEach(() => {
  cleanup();
});

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...rest }: ImageProps) =>
    React.createElement('img', { src: typeof src === 'string' ? src : '', alt, ...rest }),
}));

vi.mock('server-only', () => ({}));
