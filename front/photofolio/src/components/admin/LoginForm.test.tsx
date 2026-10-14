import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { signInWithPassword, replace, refresh } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('@/lib/supabase-browser', () => ({
  createSupabaseBrowserClient: () => ({ auth: { signInWithPassword } }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }) }));

import LoginForm from './LoginForm';

function submit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('LoginForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('signs in and goes to the admin', async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    render(<LoginForm />);
    submit('me@example.com', 'secret');

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin'));
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'me@example.com', password: 'secret' });
    expect(refresh).toHaveBeenCalled();
  });

  it('shows a clear message for wrong credentials', async () => {
    signInWithPassword.mockResolvedValue({ error: { status: 400, message: 'Invalid login credentials' } });
    render(<LoginForm />);
    submit('me@example.com', 'wrong');

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('shows a generic message when the server cannot be reached', async () => {
    signInWithPassword.mockResolvedValue({ error: { status: 0, message: 'Failed to fetch' } });
    render(<LoginForm />);
    submit('me@example.com', 'secret');

    expect(await screen.findByText("Couldn't sign in right now. Try again.")).toBeInTheDocument();
  });
});
