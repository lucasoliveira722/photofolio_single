import { describe, it, expect, vi, beforeEach } from 'vitest';

const { upload, remove } = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn() }));
vi.mock('@/lib/supabase-browser', () => ({
  createSupabaseBrowserClient: () => ({ storage: { from: () => ({ upload, remove }) } }),
}));
vi.mock('./shrinkImage', () => ({ shrinkImage: vi.fn() }));
vi.mock('@/app/(admin)/admin/actions', () => ({ createImage: vi.fn() }));

import { uploadPhoto, validateFile, MAX_UPLOAD_BYTES } from './uploadPhoto';
import { shrinkImage } from './shrinkImage';
import { createImage } from '@/app/(admin)/admin/actions';

const file = new File(['x'], 'IMG_9495.jpg', { type: 'image/jpeg' });

describe('validateFile', () => {
  it('rejects non-images and files over 50 MB', () => {
    expect(validateFile(new File(['x'], 'notes.txt', { type: 'text/plain' }))).toBe('Not an image file.');
    const huge = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(huge, 'size', { value: MAX_UPLOAD_BYTES + 1 });
    expect(validateFile(huge)).toBe('File is larger than 50 MB.');
    expect(validateFile(file)).toBeNull();
  });
});

describe('uploadPhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(shrinkImage).mockResolvedValue({ blob: new Blob(['jpg']), width: 2560, height: 1707 });
    upload.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
  });

  it('shrinks, uploads, and saves the photo, reporting each step', async () => {
    vi.mocked(createImage).mockResolvedValue({ ok: true });
    const statuses: string[] = [];

    expect(await uploadPhoto(file, 'cat-1', (status) => statuses.push(status))).toEqual({ ok: true });

    expect(statuses).toEqual(['resizing', 'uploading', 'saving']);
    const [path, , options] = upload.mock.calls[0];
    expect(path).toMatch(/^photos\/[0-9a-f-]{36}\.jpg$/);
    expect(options).toEqual({ contentType: 'image/jpeg' });
    expect(createImage).toHaveBeenCalledWith({ categoryId: 'cat-1', storagePath: path, title: 'IMG_9495', width: 2560, height: 1707 });
  });

  it('fails clearly when the image cannot be decoded (shrink failure)', async () => {
    vi.mocked(shrinkImage).mockRejectedValue(new Error('decode failed'));

    expect(await uploadPhoto(file, 'cat-1', vi.fn())).toEqual({ ok: false, error: "Couldn't read this image. Try a JPEG or PNG." });
    expect(upload).not.toHaveBeenCalled();
  });

  it('does not save when the upload fails', async () => {
    upload.mockResolvedValue({ error: { message: 'new row violates row-level security policy' } });

    expect(await uploadPhoto(file, 'cat-1', vi.fn())).toEqual({
      ok: false,
      error: 'Upload failed: new row violates row-level security policy',
    });
    expect(createImage).not.toHaveBeenCalled();
  });

  it('removes the uploaded file when saving fails (createImage failure removes file)', async () => {
    vi.mocked(createImage).mockResolvedValue({ ok: false, error: 'Your session expired. Sign in again.', signedOut: true });

    const result = await uploadPhoto(file, 'cat-1', vi.fn());

    expect(result).toEqual({ ok: false, error: 'Your session expired. Sign in again.', signedOut: true });
    expect(remove).toHaveBeenCalledWith([upload.mock.calls[0][0]]);
  });
});
