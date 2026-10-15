import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeSupabase } from '@/test/fakeSupabase';

vi.mock('@/lib/admin/auth', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/supabase-server', () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

import {
  createCategory,
  renameCategory,
  deleteCategory,
  reorderCategories,
  createImage,
  updateImage,
  setFeatured,
  reorderImages,
  deleteImage,
  updateProfile,
} from './actions';
import { requireAdmin } from '@/lib/admin/auth';
import { revalidatePath } from 'next/cache';
import { SIGNED_OUT_ERROR } from '@/lib/admin/types';

function asAdmin(results: Parameters<typeof fakeSupabase>[0] = {}) {
  const fake = fakeSupabase(results);
  vi.mocked(requireAdmin).mockResolvedValue({ ok: true, supabase: fake.client, userId: 'u1' });
  return fake;
}

describe('admin actions', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('authorization', () => {
    it('returns a signed-out error without writing when the session is gone', async () => {
      vi.mocked(requireAdmin).mockResolvedValue({ ok: false, reason: 'signed-out' });
      expect(await setFeatured('img-1', true)).toEqual({ ok: false, error: SIGNED_OUT_ERROR, signedOut: true });
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('returns a not-authorized error for a non-admin account', async () => {
      vi.mocked(requireAdmin).mockResolvedValue({ ok: false, reason: 'not-admin' });
      expect(await deleteImage('img-1')).toEqual({ ok: false, error: 'This account is not authorized.' });
    });
  });

  describe('createCategory', () => {
    it('rejects an empty name', async () => {
      const fake = asAdmin();
      expect(await createCategory('   ')).toEqual({ ok: false, error: 'Category name is required.' });
      expect(fake.calls).toHaveLength(0);
    });

    it('creates a unique slug at the end of the order', async () => {
      const fake = asAdmin({
        'categories.select': [
          { data: [{ slug: 'sao-paulo' }], error: null },
          { data: { display_order: 4 }, error: null },
        ],
      });

      expect(await createCategory(' São Paulo ')).toEqual({ ok: true, slug: 'sao-paulo-2' });
      const insert = fake.calls.find((c) => c.op === 'insert');
      expect(insert?.chain[0]).toEqual(['insert', { name: 'São Paulo', slug: 'sao-paulo-2', display_order: 5 }]);
      expect(revalidatePath).toHaveBeenCalledWith('/admin');
    });

    it('turns a database error into a readable failure', async () => {
      asAdmin({ 'categories.select': [{ data: null, error: { message: 'timeout' } }] });
      expect(await createCategory('Weddings')).toEqual({ ok: false, error: "Couldn't load categories: timeout" });
    });
  });

  it('renames without touching the slug', async () => {
    const fake = asAdmin();
    expect(await renameCategory('cat-1', ' Portraits ')).toEqual({ ok: true });
    expect(fake.calls[0].chain).toEqual([['update', { name: 'Portraits' }], ['eq', 'id', 'cat-1']]);
  });

  describe('deleteCategory', () => {
    it('deletes the photo files, then the category', async () => {
      const fake = asAdmin({
        'images.select': [{ data: [{ storage_path: 'photos/a.jpg' }, { storage_path: 'photos/b.jpg' }], error: null }],
      });

      expect(await deleteCategory('cat-1')).toEqual({ ok: true });
      expect(fake.storageCalls).toEqual([{ bucket: 'portfolio-images', method: 'remove', args: [['photos/a.jpg', 'photos/b.jpg']] }]);
      expect(fake.calls.at(-1)).toMatchObject({ table: 'categories', op: 'delete' });
    });

    it('skips storage for an empty category', async () => {
      const fake = asAdmin({ 'images.select': [{ data: [], error: null }] });
      await deleteCategory('cat-1');
      expect(fake.storageCalls).toHaveLength(0);
    });

    it('keeps the category when the files cannot be deleted', async () => {
      const fake = asAdmin({
        'images.select': [{ data: [{ storage_path: 'photos/a.jpg' }], error: null }],
        'storage.remove': [{ data: null, error: { message: 'denied' } }],
      });

      expect(await deleteCategory('cat-1')).toEqual({ ok: false, error: "Couldn't delete the photo files: denied" });
      expect(fake.calls.some((c) => c.op === 'delete')).toBe(false);
    });
  });

  it('reorders categories and images through the SQL functions', async () => {
    const fake = asAdmin();
    await reorderCategories(['b', 'a']);
    await reorderImages(['y', 'x']);
    expect(fake.rpcCalls).toEqual([
      { fn: 'reorder_categories', args: { ids: ['b', 'a'] } },
      { fn: 'reorder_images', args: { ids: ['y', 'x'] } },
    ]);
  });

  describe('createImage', () => {
    const input = { categoryId: 'cat-1', storagePath: 'photos/abc.jpg', title: 'IMG_1', width: 2560, height: 1707 };

    it('inserts the photo at the end of its category', async () => {
      const fake = asAdmin({ 'images.select': [{ data: { display_order: 2 }, error: null }] });

      expect(await createImage(input)).toEqual({ ok: true });
      const insert = fake.calls.find((c) => c.op === 'insert');
      expect(insert?.chain[0]).toEqual([
        'insert',
        { category_id: 'cat-1', storage_path: 'photos/abc.jpg', title: 'IMG_1', width: 2560, height: 1707, display_order: 3 },
      ]);
    });

    it('rejects paths outside photos/ and bad dimensions', async () => {
      asAdmin();
      expect(await createImage({ ...input, storagePath: 'other/abc.jpg' })).toMatchObject({ ok: false });
      expect(await createImage({ ...input, width: 0 })).toMatchObject({ ok: false });
    });
  });

  describe('updateImage', () => {
    it('requires a title', async () => {
      asAdmin();
      expect(await updateImage('img-1', { title: ' ', description: '', categoryId: 'cat-1' })).toEqual({
        ok: false,
        error: 'Title is required.',
      });
    });

    it('saves title and description in the same category without changing the order', async () => {
      const fake = asAdmin({ 'images.select': [{ data: { category_id: 'cat-1' }, error: null }] });

      await updateImage('img-1', { title: ' Dunes ', description: '  ', categoryId: 'cat-1' });
      const update = fake.calls.find((c) => c.op === 'update');
      expect(update?.chain[0]).toEqual(['update', { title: 'Dunes', description: null }]);
    });

    it('appends a moved photo to the end of the target category', async () => {
      const fake = asAdmin({
        'images.select': [
          { data: { category_id: 'cat-1' }, error: null },
          { data: { display_order: 7 }, error: null },
        ],
      });

      await updateImage('img-1', { title: 'Dunes', description: 'Sand', categoryId: 'cat-2' });
      const update = fake.calls.find((c) => c.op === 'update');
      expect(update?.chain[0]).toEqual([
        'update',
        { title: 'Dunes', description: 'Sand', category_id: 'cat-2', display_order: 8 },
      ]);
    });
  });

  it('sets the featured flag', async () => {
    const fake = asAdmin();
    await setFeatured('img-1', true);
    expect(fake.calls[0].chain).toEqual([['update', { is_featured: true }], ['eq', 'id', 'img-1']]);
  });

  it('deletes the photo file, then its row', async () => {
    const fake = asAdmin({ 'images.select': [{ data: { storage_path: 'photos/a.jpg' }, error: null }] });

    expect(await deleteImage('img-1')).toEqual({ ok: true });
    expect(fake.storageCalls[0].args).toEqual([['photos/a.jpg']]);
    expect(fake.calls.at(-1)).toMatchObject({ table: 'images', op: 'delete' });
  });

  describe('updateProfile', () => {
    const input = { bio: '  Olá, sou fotógrafo.  ', email: ' lucas@example.com ', instagram: '@lucas.foto' };

    it('saves the trimmed bio, email, and bare Instagram handle', async () => {
      const fake = asAdmin({ 'site_profile.update': [{ data: [{ id: true }], error: null }] });

      expect(await updateProfile(input)).toEqual({
        ok: true,
        profile: { bio: 'Olá, sou fotógrafo.', email: 'lucas@example.com', instagram: 'lucas.foto' },
      });
      expect(fake.calls[0].chain).toEqual([
        ['update', { bio: 'Olá, sou fotógrafo.', email: 'lucas@example.com', instagram: 'lucas.foto' }],
        ['eq', 'id', true],
        ['select', 'id'],
      ]);
      expect(revalidatePath).toHaveBeenCalledWith('/admin/profile');
    });

    it('allows clearing the email and Instagram', async () => {
      asAdmin({ 'site_profile.update': [{ data: [{ id: true }], error: null }] });
      expect(await updateProfile({ bio: 'Olá', email: ' ', instagram: '' })).toMatchObject({ ok: true });
    });

    it.each([
      [{ ...input, email: 'lucas@example' }, 'Enter a valid email address.'],
      [{ ...input, instagram: 'lucas foto' }, 'Enter an Instagram handle like @yourname.'],
      [{ ...input, bio: 'a'.repeat(2001) }, 'The bio can be at most 2000 characters.'],
    ])('rejects invalid input without writing', async (bad, error) => {
      const fake = asAdmin();
      expect(await updateProfile(bad)).toEqual({ ok: false, error });
      expect(fake.calls).toHaveLength(0);
    });

    it('reports a failure when no row was updated', async () => {
      asAdmin({ 'site_profile.update': [{ data: [], error: null }] });
      expect(await updateProfile(input)).toEqual({
        ok: false,
        error: "Couldn't save the profile: the profile row is missing.",
      });
    });
  });
});
