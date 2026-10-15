import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/admin/auth', () => ({ requireAdmin: vi.fn() }));
vi.mock('next/server', () => ({ connection: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/admin/queries', () => ({ getAdminData: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('@/app/(admin)/admin/actions', () => ({ signOut: vi.fn() }));
vi.mock('./CategoryList', () => ({ default: ({ activeSlug }: { activeSlug: string | null }) => <div data-testid="category-list">{activeSlug}</div> }));
vi.mock('./PhotoManager', () => ({ default: () => <div data-testid="photo-manager" /> }));

import AdminDashboard from './AdminDashboard';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminData } from '@/lib/admin/queries';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';

const searchParams = Promise.resolve({ category: 'weddings' });
const category = { id: 'c1', slug: 'weddings', name: 'Weddings', displayOrder: 0, photoCount: 0 };

describe('AdminDashboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirects to the login page when signed out', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: false, reason: 'signed-out' });
    await expect(AdminDashboard({ searchParams })).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/login?next=%2Fadmin%3Fcategory%3Dweddings');
  });

  it('shows the error page, not the not-authorized view, when the account check fails', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: false, reason: 'error', message: 'timeout' });
    await expect(AdminDashboard({ searchParams })).rejects.toThrow("Couldn't check your account: timeout");
  });

  it('shows the not-authorized view for a non-admin account', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: false, reason: 'not-admin' });
    render(await AdminDashboard({ searchParams }));
    expect(screen.getByText("This account isn't authorized.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('renders the categories and photos for the admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true, supabase: {} as never, userId: 'u1' });
    vi.mocked(getAdminData).mockResolvedValue({ categories: [category], activeCategory: category, images: [] });

    render(await AdminDashboard({ searchParams }));

    expect(getAdminData).toHaveBeenCalledWith({}, 'weddings');
    expect(screen.getByTestId('category-list')).toHaveTextContent('weddings');
    expect(screen.getByTestId('photo-manager')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View site' })).toHaveAttribute('href', '/');
  });

  it('prompts to create a category when there are none', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true, supabase: {} as never, userId: 'u1' });
    vi.mocked(getAdminData).mockResolvedValue({ categories: [], activeCategory: null, images: [] });

    render(await AdminDashboard({ searchParams }));

    expect(screen.getByText('Create a category to start adding photos.')).toBeInTheDocument();
    expect(screen.queryByTestId('photo-manager')).not.toBeInTheDocument();
  });

  it('waits for the request before reading the session', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: false, reason: 'not-admin' });
    render(await AdminDashboard({ searchParams }));
    expect(connection).toHaveBeenCalled();
    expect(vi.mocked(connection).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(requireAdmin).mock.invocationCallOrder[0]
    );
  });
});
