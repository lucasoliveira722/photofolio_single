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

const CAT_1 = '11111111-1111-4111-8111-111111111111';
const CAT_2 = '22222222-2222-4222-8222-222222222222';
const IMG_1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const IMG_2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const changed = (id: string) => ({ data: [{ id }], error: null });
const unchanged = { data: [], error: null };

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
      expect(await setFeatured(IMG_1, true)).toEqual({ ok: false, error: SIGNED_OUT_ERROR, signedOut: true });
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('returns a not-authorized error for a non-admin account', async () => {
      vi.mocked(requireAdmin).mockResolvedValue({ ok: false, reason: 'not-admin' });
      expect(await deleteImage(IMG_1)).toEqual({ ok: false, error: 'This account is not authorized.' });
    });

    it('reports a failed account check as an error, not as not-authorized', async () => {
      vi.mocked(requireAdmin).mockResolvedValue({ ok: false, reason: 'error', message: 'timeout' });
      expect(await deleteImage(IMG_1)).toEqual({ ok: false, error: "Couldn't check your account: timeout" });
    });
  });

  describe('input checks', () => {
    it.each([
      ['renameCategory', () => renameCategory('cat-1', 'Name')],
      ['deleteCategory', () => deleteCategory('../x')],
      ['reorderCategories', () => reorderCategories('nope' as unknown as string[])],
      ['reorderCategories duplicates', () => reorderCategories([CAT_1, CAT_1])],
      ['createCategory', () => createCategory(42 as unknown as string)],
      ['createImage', () => createImage({ categoryId: 'x', storagePath: 'photos/a.jpg', title: 'A', width: 1, height: 1 })],
      ['updateImage', () => updateImage(IMG_1, { title: 'A', description: null as unknown as string, categoryId: CAT_1 })],
      ['setFeatured', () => setFeatured(IMG_1, 'yes' as unknown as boolean)],
      ['reorderImages', () => reorderImages(CAT_1, [IMG_1, 7 as unknown as string])],
      ['deleteImage', () => deleteImage('')],
      ['updateProfile', () => updateProfile({ bio: 'a', email: undefined as unknown as string, instagram: '' })],
    ])('%s rejects malformed input without touching the database', async (_name, call) => {
      const fake = asAdmin();
      expect(await call()).toEqual({ ok: false, error: 'Invalid request.' });
      expect(fake.calls).toHaveLength(0);
      expect(fake.rpcCalls).toHaveLength(0);
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

  describe('renameCategory', () => {
    it('renames without touching the slug', async () => {
      const fake = asAdmin({ 'categories.update': [changed(CAT_1)] });
      expect(await renameCategory(CAT_1, ' Portraits ')).toEqual({ ok: true });
      expect(fake.calls[0].chain).toEqual([['update', { name: 'Portraits' }], ['eq', 'id', CAT_1], ['select', 'id']]);
    });

    it('reports a failure when nothing was renamed', async () => {
      asAdmin({ 'categories.update': [unchanged] });
      expect(await renameCategory(CAT_1, 'Portraits')).toEqual({
        ok: false,
        error: "Couldn't rename the category: nothing was changed. Reload and try again.",
      });
    });
  });

  describe('deleteCategory', () => {
    it('deletes the category, then its photo files', async () => {
      const fake = asAdmin({
        'images.select': [{ data: [{ storage_path: 'photos/a.jpg' }, { storage_path: 'photos/b.jpg' }], error: null }],
        'categories.delete': [changed(CAT_1)],
      });

      expect(await deleteCategory(CAT_1)).toEqual({ ok: true });
      expect(fake.calls.at(-1)).toMatchObject({ table: 'categories', op: 'delete' });
      expect(fake.storageCalls).toEqual([{ bucket: 'portfolio-images', method: 'remove', args: [['photos/a.jpg', 'photos/b.jpg']] }]);
    });

    it('skips storage for an empty category', async () => {
      const fake = asAdmin({ 'images.select': [{ data: [], error: null }], 'categories.delete': [changed(CAT_1)] });
      await deleteCategory(CAT_1);
      expect(fake.storageCalls).toHaveLength(0);
    });

    it('keeps the files when the category could not be deleted', async () => {
      const fake = asAdmin({
        'images.select': [{ data: [{ storage_path: 'photos/a.jpg' }], error: null }],
        'categories.delete': [unchanged],
      });

      expect(await deleteCategory(CAT_1)).toEqual({
        ok: false,
        error: "Couldn't delete the category: nothing was changed. Reload and try again.",
      });
      expect(fake.storageCalls).toHaveLength(0);
    });

    it('still succeeds when the leftover files cannot be removed', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      asAdmin({
        'images.select': [{ data: [{ storage_path: 'photos/a.jpg' }], error: null }],
        'categories.delete': [changed(CAT_1)],
        'storage.remove': [{ data: null, error: { message: 'denied' } }],
      });

      expect(await deleteCategory(CAT_1)).toEqual({ ok: true });
    });
  });

  describe('reorderCategories', () => {
    it('reorders through the SQL function', async () => {
      const fake = asAdmin({ 'categories.select': [{ data: [{ id: CAT_1 }, { id: CAT_2 }], error: null }] });
      expect(await reorderCategories([CAT_2, CAT_1])).toEqual({ ok: true });
      expect(fake.rpcCalls).toEqual([{ fn: 'reorder_categories', args: { ids: [CAT_2, CAT_1] } }]);
    });

    it('refuses an order that does not list exactly the existing categories', async () => {
      const fake = asAdmin({ 'categories.select': [{ data: [{ id: CAT_1 }, { id: CAT_2 }], error: null }] });
      expect(await reorderCategories([CAT_1])).toEqual({
        ok: false,
        error: 'The categories changed since this page loaded. Reload and try again.',
      });
      expect(fake.rpcCalls).toHaveLength(0);
    });
  });

  describe('createImage', () => {
    const input = { categoryId: CAT_1, storagePath: 'photos/abc.jpg', title: 'IMG_1', width: 2560, height: 1707 };

    it('inserts the photo at the end of its category', async () => {
      const fake = asAdmin({ 'images.select': [{ data: { display_order: 2 }, error: null }] });

      expect(await createImage(input)).toEqual({ ok: true });
      const insert = fake.calls.find((c) => c.op === 'insert');
      expect(insert?.chain[0]).toEqual([
        'insert',
        { category_id: CAT_1, storage_path: 'photos/abc.jpg', title: 'IMG_1', width: 2560, height: 1707, display_order: 3 },
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
      expect(await updateImage(IMG_1, { title: ' ', description: '', categoryId: CAT_1 })).toEqual({
        ok: false,
        error: 'Title is required.',
      });
    });

    it('saves title and description in the same category without changing the order', async () => {
      const fake = asAdmin({
        'images.select': [{ data: { category_id: CAT_1 }, error: null }],
        'images.update': [changed(IMG_1)],
      });

      expect(await updateImage(IMG_1, { title: ' Dunes ', description: '  ', categoryId: CAT_1 })).toEqual({ ok: true });
      const update = fake.calls.find((c) => c.op === 'update');
      expect(update?.chain).toEqual([['update', { title: 'Dunes', description: null }], ['eq', 'id', IMG_1], ['select', 'id']]);
    });

    it('appends a moved photo to the end of the target category', async () => {
      const fake = asAdmin({
        'images.select': [
          { data: { category_id: CAT_1 }, error: null },
          { data: { display_order: 7 }, error: null },
        ],
        'images.update': [changed(IMG_1)],
      });

      await updateImage(IMG_1, { title: 'Dunes', description: 'Sand', categoryId: CAT_2 });
      const update = fake.calls.find((c) => c.op === 'update');
      expect(update?.chain[0]).toEqual([
        'update',
        { title: 'Dunes', description: 'Sand', category_id: CAT_2, display_order: 8 },
      ]);
    });

    it('reports a failure when nothing was saved', async () => {
      asAdmin({ 'images.select': [{ data: { category_id: CAT_1 }, error: null }], 'images.update': [unchanged] });
      expect(await updateImage(IMG_1, { title: 'Dunes', description: '', categoryId: CAT_1 })).toMatchObject({ ok: false });
    });
  });

  describe('setFeatured', () => {
    it('sets the featured flag', async () => {
      const fake = asAdmin({ 'images.update': [changed(IMG_1)] });
      expect(await setFeatured(IMG_1, true)).toEqual({ ok: true });
      expect(fake.calls[0].chain).toEqual([['update', { is_featured: true }], ['eq', 'id', IMG_1], ['select', 'id']]);
    });

    it('reports a failure when nothing was updated', async () => {
      asAdmin({ 'images.update': [unchanged] });
      expect(await setFeatured(IMG_1, true)).toEqual({
        ok: false,
        error: "Couldn't update the photo: nothing was changed. Reload and try again.",
      });
    });
  });

  describe('reorderImages', () => {
    it("reorders the category's photos through the SQL function", async () => {
      const fake = asAdmin({ 'images.select': [{ data: [{ id: IMG_1 }, { id: IMG_2 }], error: null }] });

      expect(await reorderImages(CAT_1, [IMG_2, IMG_1])).toEqual({ ok: true });
      expect(fake.calls[0].chain).toContainEqual(['eq', 'category_id', CAT_1]);
      expect(fake.rpcCalls).toEqual([{ fn: 'reorder_images', args: { ids: [IMG_2, IMG_1] } }]);
    });

    it('refuses ids that are not exactly the photos of that category', async () => {
      const fake = asAdmin({ 'images.select': [{ data: [{ id: IMG_1 }], error: null }] });

      expect(await reorderImages(CAT_1, [IMG_2, IMG_1])).toEqual({
        ok: false,
        error: 'The photos changed since this page loaded. Reload and try again.',
      });
      expect(fake.rpcCalls).toHaveLength(0);
    });
  });

  describe('deleteImage', () => {
    it('deletes the row, then the photo file', async () => {
      const fake = asAdmin({
        'images.select': [{ data: { storage_path: 'photos/a.jpg' }, error: null }],
        'images.delete': [changed(IMG_1)],
      });

      expect(await deleteImage(IMG_1)).toEqual({ ok: true });
      expect(fake.calls.at(-1)).toMatchObject({ table: 'images', op: 'delete' });
      expect(fake.storageCalls[0].args).toEqual([['photos/a.jpg']]);
    });

    it('keeps the file when the row could not be deleted', async () => {
      const fake = asAdmin({
        'images.select': [{ data: { storage_path: 'photos/a.jpg' }, error: null }],
        'images.delete': [{ data: null, error: { message: 'denied' } }],
      });

      expect(await deleteImage(IMG_1)).toEqual({ ok: false, error: "Couldn't delete the photo: denied" });
      expect(fake.storageCalls).toHaveLength(0);
    });

    it('still succeeds when the file cannot be removed afterwards', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      asAdmin({
        'images.select': [{ data: { storage_path: 'photos/a.jpg' }, error: null }],
        'images.delete': [changed(IMG_1)],
        'storage.remove': [{ data: null, error: { message: 'denied' } }],
      });

      expect(await deleteImage(IMG_1)).toEqual({ ok: true });
    });
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
      asAdmin({ 'site_profile.update': [unchanged] });
      expect(await updateProfile(input)).toEqual({
        ok: false,
        error: "Couldn't save the profile: nothing was changed. Reload and try again.",
      });
    });
  });
});
