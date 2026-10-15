import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/server', () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/api', () => ({
  getProfile: vi.fn(),
}));

import ProfileIntro from './ProfileIntro';
import { getProfile } from '@/lib/api';

describe('ProfileIntro', () => {
  it('renders the bio as paragraphs with the contact links', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      bio: 'Sou fotógrafo.\n\nVeja o portfólio.',
      email: 'lucas@example.com',
      instagram: 'lucas.foto',
    });

    render(await ProfileIntro());

    expect(screen.getByText('Sou fotógrafo.')).toBeInTheDocument();
    expect(screen.getByText('Veja o portfólio.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Email' })).toHaveAttribute('href', 'mailto:lucas@example.com');
    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/lucas.foto');
  });

  it('hides the links that are empty', async () => {
    vi.mocked(getProfile).mockResolvedValue({ bio: 'Olá', email: '', instagram: 'lucas.foto' });

    render(await ProfileIntro());

    expect(screen.queryByRole('link', { name: 'Email' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Instagram' })).toBeInTheDocument();
  });

  it('renders nothing when the profile fails to load', async () => {
    vi.mocked(getProfile).mockRejectedValue(new Error('network error'));

    const { container } = render(await ProfileIntro());

    expect(container).toBeEmptyDOMElement();
  });
});
