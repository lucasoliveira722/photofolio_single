import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/app/(admin)/admin/actions', () => ({ updateProfile: vi.fn() }));

import ProfileForm from './ProfileForm';
import { updateProfile } from '@/app/(admin)/admin/actions';

const profile = { bio: 'Olá', email: 'lucas@example.com', instagram: 'lucas.foto' };

describe('ProfileForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is prefilled with the saved profile', () => {
    render(<ProfileForm profile={profile} />);
    expect(screen.getByLabelText('Bio')).toHaveValue('Olá');
    expect(screen.getByLabelText('Email')).toHaveValue('lucas@example.com');
    expect(screen.getByLabelText('Instagram')).toHaveValue('lucas.foto');
  });

  it('saves the fields and shows the stored values', async () => {
    vi.mocked(updateProfile).mockResolvedValue({
      ok: true,
      profile: { bio: 'Sou fotógrafo.', email: 'lucas@example.com', instagram: 'novo' },
    });
    render(<ProfileForm profile={profile} />);

    fireEvent.change(screen.getByLabelText('Bio'), { target: { value: 'Sou fotógrafo.' } });
    fireEvent.change(screen.getByLabelText('Instagram'), { target: { value: 'https://instagram.com/novo/' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    expect(updateProfile).toHaveBeenCalledWith({
      bio: 'Sou fotógrafo.',
      email: 'lucas@example.com',
      instagram: 'https://instagram.com/novo/',
    });
    expect(screen.getByLabelText('Instagram')).toHaveValue('novo');
  });

  it('keeps the typed values and shows the error when saving fails', async () => {
    vi.mocked(updateProfile).mockResolvedValue({ ok: false, error: 'Enter a valid email address.' });
    render(<ProfileForm profile={profile} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'lucas@example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('lucas@example');
    expect(screen.queryByText('Saved.')).not.toBeInTheDocument();
  });

  it('clears "Saved." once a field changes again', async () => {
    vi.mocked(updateProfile).mockResolvedValue({ ok: true, profile });
    render(<ProfileForm profile={profile} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('Saved.')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Bio'), { target: { value: 'Olá!' } });

    expect(screen.queryByText('Saved.')).not.toBeInTheDocument();
  });
});
