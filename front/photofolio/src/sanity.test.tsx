import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

function Greeting() {
  return <p>hello from vitest</p>;
}

describe('test harness sanity check', () => {
  it('renders with React Testing Library in a jsdom environment', () => {
    render(<Greeting />);
    expect(screen.getByText('hello from vitest')).toBeInTheDocument();
  });
});
