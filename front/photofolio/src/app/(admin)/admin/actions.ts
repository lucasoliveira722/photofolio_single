'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/auth';
import { createSupabaseServerClient, type AdminSupabase } from '@/lib/supabase-server';
import { slugify, uniqueSlug } from '@/lib/admin/slug';
import { IMAGE_BUCKET } from '@/lib/storage';
import { SIGNED_OUT_ERROR, type ActionFailure, type ActionResult } from '@/lib/admin/types';
import type { Database } from '@/lib/database.types';
import { BIO_MAX_LENGTH, isValidEmail, normalizeInstagram, type Profile } from '@/lib/profile';

class ActionError extends Error {}

// Server actions are public endpoints, so arguments are checked at runtime, not just by their types.
const INVALID: ActionFailure = { ok: false, error: 'Invalid request.' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isId(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

function isIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isId) && new Set(value).size === value.length;
}

function areStrings(...values: unknown[]): boolean {
  return values.every((value) => typeof value === 'string');
}

function sameIds(ids: string[], rows: { id: string }[]): boolean {
  const existing = new Set(rows.map((row) => row.id));
  return ids.length === existing.size && ids.every((id) => existing.has(id));
}

// Unwraps a supabase-js result, turning its error into a readable ActionError.
function must<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) throw new ActionError(`Couldn't ${what}: ${result.error.message}`);
  return result.data;
}

// Like must, for reads that have to return something.
function mustHave<T>(result: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  const data = must(result, what);
  if (data === null || data === undefined) throw new ActionError(`Couldn't ${what}: not found`);
  return data;
}

// For updates and deletes ending in .select(): row-level security (or a row that's already gone)
// turns a write into a silent no-op, so require that at least one row changed.
function mustChange(result: { data: unknown[] | null; error: { message: string } | null }, what: string): void {
  const rows = must(result, what);
  if (!rows || rows.length === 0) throw new ActionError(`Couldn't ${what}: nothing was changed. Reload and try again.`);
}

async function withAdmin<T extends object>(
  run: (supabase: AdminSupabase) => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.reason === 'signed-out') return { ok: false, error: SIGNED_OUT_ERROR, signedOut: true };
    if (auth.reason === 'error') return { ok: false, error: `Couldn't check your account: ${auth.message}` };
    return { ok: false, error: 'This account is not authorized.' };
  }

  try {
    const result = await run(auth.supabase);
    if (result.ok) revalidatePath('/admin');
    return result;
  } catch (error) {
    if (error instanceof ActionError) return { ok: false, error: error.message };
    throw error;
  }
}

// Files are removed after their rows, so a failure here only leaves an unused file in Storage.
async function removeFiles(supabase: AdminSupabase, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove(paths);
  if (error) console.error(`Couldn't remove photo files ${paths.join(', ')}: ${error.message}`);
}

async function nextCategoryOrder(supabase: AdminSupabase): Promise<number> {
  const last = must(
    await supabase
      .from('categories')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle(),
    'load categories'
  );
  return last ? last.display_order + 1 : 0;
}

async function nextImageOrder(supabase: AdminSupabase, categoryId: string): Promise<number> {
  const last = must(
    await supabase
      .from('images')
      .select('display_order')
      .eq('category_id', categoryId)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle(),
    'load photos'
  );
  return last ? last.display_order + 1 : 0;
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function createCategory(name: string) {
  return withAdmin<{ slug: string }>(async (supabase) => {
    if (!areStrings(name)) return INVALID;
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: 'Category name is required.' };

    const existing = mustHave(await supabase.from('categories').select('slug'), 'load categories');
    const slug = uniqueSlug(slugify(trimmed), existing.map((category) => category.slug));
    const display_order = await nextCategoryOrder(supabase);

    must(await supabase.from('categories').insert({ name: trimmed, slug, display_order }), 'create the category');
    return { ok: true, slug };
  });
}

export async function renameCategory(id: string, name: string) {
  return withAdmin<object>(async (supabase) => {
    if (!isId(id) || !areStrings(name)) return INVALID;
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: 'Category name is required.' };

    mustChange(
      await supabase.from('categories').update({ name: trimmed }).eq('id', id).select('id'),
      'rename the category'
    );
    return { ok: true };
  });
}

export async function deleteCategory(id: string) {
  return withAdmin(async (supabase) => {
    if (!isId(id)) return INVALID;
    const images = mustHave(
      await supabase.from('images').select('storage_path').eq('category_id', id),
      "load the category's photos"
    );

    // Deleting the category also deletes its photo rows (on delete cascade).
    mustChange(await supabase.from('categories').delete().eq('id', id).select('id'), 'delete the category');
    await removeFiles(supabase, images.map((image) => image.storage_path));
    return { ok: true };
  });
}

export async function reorderCategories(ids: string[]) {
  return withAdmin(async (supabase) => {
    if (!isIdList(ids)) return INVALID;
    const existing = mustHave(await supabase.from('categories').select('id'), 'load categories');
    if (!sameIds(ids, existing)) {
      return { ok: false, error: 'The categories changed since this page loaded. Reload and try again.' };
    }

    must(await supabase.rpc('reorder_categories', { ids }), 'save the new order');
    return { ok: true };
  });
}

export async function createImage(input: {
  categoryId: string;
  storagePath: string;
  title: string;
  width: number;
  height: number;
}) {
  return withAdmin<object>(async (supabase) => {
    if (!isId(input?.categoryId) || !areStrings(input.storagePath, input.title)) return INVALID;
    const title = input.title.trim();
    if (!title) return { ok: false, error: 'Title is required.' };
    if (!input.storagePath.startsWith('photos/')) return { ok: false, error: 'Invalid file location.' };
    if (!Number.isInteger(input.width) || !Number.isInteger(input.height) || input.width < 1 || input.height < 1) {
      return { ok: false, error: 'Invalid image dimensions.' };
    }

    const display_order = await nextImageOrder(supabase, input.categoryId);
    must(
      await supabase.from('images').insert({
        category_id: input.categoryId,
        storage_path: input.storagePath,
        title,
        width: input.width,
        height: input.height,
        display_order,
      }),
      'save the photo'
    );
    return { ok: true };
  });
}

export async function updateImage(id: string, input: { title: string; description: string; categoryId: string }) {
  return withAdmin<object>(async (supabase) => {
    if (!isId(id) || !isId(input?.categoryId) || !areStrings(input.title, input.description)) return INVALID;
    const title = input.title.trim();
    if (!title) return { ok: false, error: 'Title is required.' };

    const current = mustHave(await supabase.from('images').select('category_id').eq('id', id).single(), 'load the photo');

    const changes: Database['public']['Tables']['images']['Update'] = {
      title,
      description: input.description.trim() || null,
    };
    if (input.categoryId !== current.category_id) {
      changes.category_id = input.categoryId;
      changes.display_order = await nextImageOrder(supabase, input.categoryId);
    }

    mustChange(await supabase.from('images').update(changes).eq('id', id).select('id'), 'save the photo');
    return { ok: true };
  });
}

export async function setFeatured(id: string, featured: boolean) {
  return withAdmin(async (supabase) => {
    if (!isId(id) || typeof featured !== 'boolean') return INVALID;
    mustChange(
      await supabase.from('images').update({ is_featured: featured }).eq('id', id).select('id'),
      'update the photo'
    );
    return { ok: true };
  });
}

export async function reorderImages(categoryId: string, ids: string[]) {
  return withAdmin(async (supabase) => {
    if (!isId(categoryId) || !isIdList(ids)) return INVALID;
    const existing = mustHave(
      await supabase.from('images').select('id').eq('category_id', categoryId),
      'load photos'
    );
    if (!sameIds(ids, existing)) {
      return { ok: false, error: 'The photos changed since this page loaded. Reload and try again.' };
    }

    must(await supabase.rpc('reorder_images', { ids }), 'save the new order');
    return { ok: true };
  });
}

export async function deleteImage(id: string) {
  return withAdmin(async (supabase) => {
    if (!isId(id)) return INVALID;
    const image = mustHave(await supabase.from('images').select('storage_path').eq('id', id).single(), 'load the photo');
    mustChange(await supabase.from('images').delete().eq('id', id).select('id'), 'delete the photo');
    await removeFiles(supabase, [image.storage_path]);
    return { ok: true };
  });
}

export async function updateProfile(input: Profile) {
  return withAdmin<{ profile: Profile }>(async (supabase) => {
    if (!areStrings(input?.bio, input?.email, input?.instagram)) return INVALID;
    const bio = input.bio.trim();
    const email = input.email.trim();
    const instagram = normalizeInstagram(input.instagram);
    if (bio.length > BIO_MAX_LENGTH) return { ok: false, error: `The bio can be at most ${BIO_MAX_LENGTH} characters.` };
    if (email && !isValidEmail(email)) return { ok: false, error: 'Enter a valid email address.' };
    if (instagram === null) return { ok: false, error: 'Enter an Instagram handle like @yourname.' };

    const profile = { bio, email, instagram };
    mustChange(
      await supabase.from('site_profile').update(profile).eq('id', true).select('id'),
      'save the profile'
    );

    revalidatePath('/admin/profile');
    return { ok: true, profile };
  });
}
