import { render, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import ErrorNotice from './ErrorNotice';

describe('ErrorNotice', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('renders nothing without a failure', () => {
    const { container } = render(<ErrorNotice failure={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('links a signed-out failure to the login page, returning to the current admin page', () => {
    window.history.replaceState(null, '', '/admin?category=weddings');
    render(<ErrorNotice failure={{ ok: false, error: 'Your session expired. Sign in again.', signedOut: true }} />);

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login?next=%2Fadmin%3Fcategory%3Dweddings'
    );
  });
});
