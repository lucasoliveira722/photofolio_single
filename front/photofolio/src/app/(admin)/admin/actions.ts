'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/auth';
import { createSupabaseServerClient, type AdminSupabase } from '@/lib/supabase-server';
import { slugify, uniqueSlug } from '@/lib/admin/slug';
import { IMAGE_BUCKET } from '@/lib/storage';
import { SIGNED_OUT_ERROR, type ActionResult } from '@/lib/admin/types';
import type { Database } from '@/lib/database.types';

class ActionError extends Error {}

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

async function withAdmin<T extends object>(
  run: (supabase: AdminSupabase) => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.reason === 'signed-out'
      ? { ok: false, error: SIGNED_OUT_ERROR, signedOut: true }
      : { ok: false, error: 'This account is not authorized.' };
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
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: 'Category name is required.' };

    must(await supabase.from('categories').update({ name: trimmed }).eq('id', id), 'rename the category');
    return { ok: true };
  });
}

export async function deleteCategory(id: string) {
  return withAdmin(async (supabase) => {
    const images = mustHave(
      await supabase.from('images').select('storage_path').eq('category_id', id),
      "load the category's photos"
    );
    if (images.length > 0) {
      must(
        await supabase.storage.from(IMAGE_BUCKET).remove(images.map((image) => image.storage_path)),
        'delete the photo files'
      );
    }

    must(await supabase.from('categories').delete().eq('id', id), 'delete the category');
    return { ok: true };
  });
}

export async function reorderCategories(ids: string[]) {
  return withAdmin(async (supabase) => {
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

    must(await supabase.from('images').update(changes).eq('id', id), 'save the photo');
    return { ok: true };
  });
}

export async function setFeatured(id: string, featured: boolean) {
  return withAdmin(async (supabase) => {
    must(await supabase.from('images').update({ is_featured: featured }).eq('id', id), 'update the photo');
    return { ok: true };
  });
}

export async function reorderImages(ids: string[]) {
  return withAdmin(async (supabase) => {
    must(await supabase.rpc('reorder_images', { ids }), 'save the new order');
    return { ok: true };
  });
}

export async function deleteImage(id: string) {
  return withAdmin(async (supabase) => {
    const image = mustHave(await supabase.from('images').select('storage_path').eq('id', id).single(), 'load the photo');
    must(await supabase.storage.from(IMAGE_BUCKET).remove([image.storage_path]), 'delete the photo file');
    must(await supabase.from('images').delete().eq('id', id), 'delete the photo');
    return { ok: true };
  });
}
