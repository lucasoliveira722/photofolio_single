import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/admin/uploadPhoto', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/admin/uploadPhoto')>()),
  uploadPhoto: vi.fn(),
}));
vi.mock('@/app/(admin)/admin/actions', () => ({ createImage: vi.fn() }));

import UploadQueue from './UploadQueue';
import { UploadProvider } from './UploadProvider';
import { uploadPhoto } from '@/lib/admin/uploadPhoto';

const weddings = { id: 'cat-1', name: 'Weddings' };
const portraits = { id: 'cat-2', name: 'Portraits' };
const jpg = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

function renderQueue(category = weddings) {
  return render(
    <UploadProvider>
      <UploadQueue category={category} />
    </UploadProvider>
  );
}

function choose(files: File[]) {
  fireEvent.change(screen.getByLabelText('Add photos'), { target: { files } });
}

function row(name: string) {
  return screen.getByText(name).closest('li')!;
}

describe('UploadQueue', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uploads every chosen file and marks each done', async () => {
    vi.mocked(uploadPhoto).mockResolvedValue({ ok: true });
    renderQueue();

    choose([jpg('a.jpg'), jpg('b.jpg')]);

    await waitFor(() => expect(screen.getAllByText('Done')).toHaveLength(2));
    expect(uploadPhoto).toHaveBeenCalledTimes(2);
    expect(vi.mocked(uploadPhoto).mock.calls[0][1]).toBe('cat-1');
  });

  it('shows queued files as waiting while another one is processed', async () => {
    vi.mocked(uploadPhoto).mockImplementation((_file, _category, onStatus) => {
      onStatus('resizing');
      return new Promise(() => {});
    });
    renderQueue();

    choose([jpg('a.jpg'), jpg('b.jpg')]);

    await waitFor(() => expect(within(row('a.jpg')).getByText('Resizing…')).toBeInTheDocument());
    expect(within(row('b.jpg')).getByText('Waiting')).toBeInTheDocument();
  });

  it('rejects a non-image without uploading it or offering a retry', async () => {
    renderQueue();

    choose([new File(['x'], 'notes.txt', { type: 'text/plain' })]);

    expect(await screen.findByText('Not an image file.')).toBeInTheDocument();
    expect(uploadPhoto).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('offers no retry for an image that cannot be read', async () => {
    vi.mocked(uploadPhoto).mockResolvedValue({ ok: false, error: "Couldn't read this image. Try a JPEG or PNG.", permanent: true });
    renderQueue();

    choose([jpg('a.heic')]);

    expect(await screen.findByText("Couldn't read this image. Try a JPEG or PNG.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('keeps going after a failure and lets the failed file be retried', async () => {
    vi.mocked(uploadPhoto)
      .mockResolvedValueOnce({ ok: false, error: 'Upload failed: network' })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true });
    renderQueue();

    choose([jpg('a.jpg'), jpg('b.jpg')]);

    expect(await screen.findByText('Upload failed: network')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('Done')).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getAllByText('Done')).toHaveLength(2));
  });

  it('shows a sign-in link when the session expired (signed-out)', async () => {
    vi.mocked(uploadPhoto).mockResolvedValue({ ok: false, error: 'Your session expired. Sign in again.', signedOut: true });
    renderQueue();

    choose([jpg('a.jpg')]);

    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('clears finished rows', async () => {
    vi.mocked(uploadPhoto).mockResolvedValue({ ok: true });
    renderQueue();

    choose([jpg('a.jpg')]);
    await screen.findByText('Done');
    fireEvent.click(screen.getByRole('button', { name: 'Clear finished' }));

    expect(screen.queryByText('a.jpg')).not.toBeInTheDocument();
  });

  it('keeps going when an upload throws, and offers a retry', async () => {
    vi.mocked(uploadPhoto).mockRejectedValueOnce(new Error('Failed to fetch')).mockResolvedValueOnce({ ok: true });
    renderQueue();

    choose([jpg('a.jpg'), jpg('b.jpg')]);

    expect(await screen.findByText("Couldn't upload this photo. Try again.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('Done')).toHaveLength(1));
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('stops the batch when the session expires', async () => {
    vi.mocked(uploadPhoto).mockResolvedValue({ ok: false, error: 'Your session expired. Sign in again.', signedOut: true });
    renderQueue();

    choose([jpg('a.jpg'), jpg('b.jpg'), jpg('c.jpg')]);

    await waitFor(() => expect(screen.getAllByRole('link', { name: 'Sign in' })).toHaveLength(3));
    expect(uploadPhoto).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(3);
  });

  it('keeps the queue when switching to another category, naming where each file goes', async () => {
    let finish: (value: { ok: true }) => void = () => {};
    vi.mocked(uploadPhoto).mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    const { rerender } = renderQueue(weddings);

    choose([jpg('a.jpg')]);
    // The category view remounts its queue when the admin switches category.
    rerender(
      <UploadProvider>
        <UploadQueue key="cat-2" category={portraits} />
      </UploadProvider>
    );

    expect(within(row('a.jpg')).getByText('to Weddings')).toBeInTheDocument();
    finish({ ok: true });
    await waitFor(() => expect(within(row('a.jpg')).getByText('Done')).toBeInTheDocument());
    expect(vi.mocked(uploadPhoto).mock.calls[0][1]).toBe('cat-1');
  });
});
