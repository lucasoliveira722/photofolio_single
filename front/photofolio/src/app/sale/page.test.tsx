import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SalePage from './page';

describe('Sale page', () => {
  it('renders a coming-soon message for prints', () => {
    render(<SalePage />);
    expect(screen.getByRole('heading', { name: /coming soon/i })).toBeInTheDocument();
    expect(screen.getByText(/prints & editions/i)).toBeInTheDocument();
  });
});
