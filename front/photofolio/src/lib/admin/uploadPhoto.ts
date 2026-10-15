import { createImage } from '@/app/(admin)/admin/actions';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { IMAGE_BUCKET } from '@/lib/storage';
import { shrinkImage } from './shrinkImage';
import { titleFromFilename } from './titleFromFilename';
import { SIGNED_OUT_ERROR, type ActionFailure, type ActionResult } from './types';

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export type UploadStatus = 'waiting' | 'resizing' | 'uploading' | 'saving' | 'done' | 'failed';

// A permanent failure won't go away by trying again (e.g. a format the browser can't decode).
export type UploadResult = { ok: true } | (ActionFailure & { permanent?: boolean });

// Some browsers report no type for formats they don't know, like HEIC on Windows.
const IMAGE_EXTENSION = /\.(jpe?g|png|gif|webp|avif|heic|heif|bmp|tiff?)$/i;

function isImage(file: File): boolean {
  return file.type ? file.type.startsWith('image/') : IMAGE_EXTENSION.test(file.name);
}

export function validateFile(file: File): string | null {
  if (!isImage(file)) return 'Not an image file.';
  if (file.size > MAX_UPLOAD_BYTES) return 'File is larger than 50 MB.';
  return null;
}

export async function uploadPhoto(
  file: File,
  categoryId: string,
  onStatus: (status: UploadStatus) => void
): Promise<UploadResult> {
  onStatus('resizing');
  let shrunk: Awaited<ReturnType<typeof shrinkImage>>;
  try {
    shrunk = await shrinkImage(file);
  } catch {
    return { ok: false, error: "Couldn't read this image. Try a JPEG or PNG.", permanent: true };
  }

  onStatus('uploading');
  const supabase = createSupabaseBrowserClient();
  // Without a live session the upload would fail with a cryptic RLS error,
  // and any file it left behind couldn't be removed either.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: SIGNED_OUT_ERROR, signedOut: true };

  const storagePath = `photos/${crypto.randomUUID()}.jpg`;
  const storage = supabase.storage.from(IMAGE_BUCKET);
  const { error: uploadError } = await storage.upload(storagePath, shrunk.blob, { contentType: 'image/jpeg' });
  if (uploadError) return { ok: false, error: `Upload failed: ${uploadError.message}` };

  onStatus('saving');
  let result: ActionResult;
  try {
    result = await createImage({
      categoryId,
      storagePath,
      title: titleFromFilename(file.name),
      width: shrunk.width,
      height: shrunk.height,
    });
  } catch {
    // Network failures or a redeploy make the action throw instead of returning an error.
    result = { ok: false, error: "Couldn't save the photo. Try again." };
  }
  // Never leave a stored file without a row pointing at it.
  if (!result.ok) await storage.remove([storagePath]);
  return result;
}
