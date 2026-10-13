import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SalePage from './page';

describe('Sale page', () => {
  it('renders a coming-soon message', () => {
    render(<SalePage />);
    expect(screen.getByRole('heading', { name: /coming soon/i })).toBeInTheDocument();
  });
});
