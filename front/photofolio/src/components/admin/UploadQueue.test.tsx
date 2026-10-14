import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/admin/uploadPhoto', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/admin/uploadPhoto')>()),
  uploadPhoto: vi.fn(),
}));
vi.mock('@/app/(admin)/admin/actions', () => ({ createImage: vi.fn() }));

import UploadQueue from './UploadQueue';
import { uploadPhoto } from '@/lib/admin/uploadPhoto';

const jpg = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

function choose(files: File[]) {
  fireEvent.change(screen.getByLabelText('Add photos'), { target: { files } });
}

describe('UploadQueue', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uploads every chosen file and marks each done', async () => {
    vi.mocked(uploadPhoto).mockResolvedValue({ ok: true });
    render(<UploadQueue categoryId="cat-1" />);

    choose([jpg('a.jpg'), jpg('b.jpg')]);

    await waitFor(() => expect(screen.getAllByText('Done')).toHaveLength(2));
    expect(uploadPhoto).toHaveBeenCalledTimes(2);
    expect(vi.mocked(uploadPhoto).mock.calls[0][1]).toBe('cat-1');
  });

  it('rejects a non-image without uploading it or offering a retry', async () => {
    render(<UploadQueue categoryId="cat-1" />);

    choose([new File(['x'], 'notes.txt', { type: 'text/plain' })]);

    expect(await screen.findByText('Not an image file.')).toBeInTheDocument();
    expect(uploadPhoto).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('keeps going after a failure and lets the failed file be retried', async () => {
    vi.mocked(uploadPhoto)
      .mockResolvedValueOnce({ ok: false, error: 'Upload failed: network' })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true });
    render(<UploadQueue categoryId="cat-1" />);

    choose([jpg('a.jpg'), jpg('b.jpg')]);

    expect(await screen.findByText('Upload failed: network')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('Done')).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getAllByText('Done')).toHaveLength(2));
  });

  it('shows a sign-in link when the session expired (signed-out)', async () => {
    vi.mocked(uploadPhoto).mockResolvedValue({ ok: false, error: 'Your session expired. Sign in again.', signedOut: true });
    render(<UploadQueue categoryId="cat-1" />);

    choose([jpg('a.jpg')]);

    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('clears finished rows', async () => {
    vi.mocked(uploadPhoto).mockResolvedValue({ ok: true });
    render(<UploadQueue categoryId="cat-1" />);

    choose([jpg('a.jpg')]);
    await screen.findByText('Done');
    fireEvent.click(screen.getByRole('button', { name: 'Clear finished' }));

    expect(screen.queryByText('a.jpg')).not.toBeInTheDocument();
  });

  it('keeps going when an upload throws, and offers a retry', async () => {
    vi.mocked(uploadPhoto).mockRejectedValueOnce(new Error('Failed to fetch')).mockResolvedValueOnce({ ok: true });
    render(<UploadQueue categoryId="cat-1" />);

    choose([jpg('a.jpg'), jpg('b.jpg')]);

    expect(await screen.findByText("Couldn't upload this photo. Try again.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('Done')).toHaveLength(1));
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('stops the batch when the session expires', async () => {
    vi.mocked(uploadPhoto).mockResolvedValue({ ok: false, error: 'Your session expired. Sign in again.', signedOut: true });
    render(<UploadQueue categoryId="cat-1" />);

    choose([jpg('a.jpg'), jpg('b.jpg'), jpg('c.jpg')]);

    await waitFor(() => expect(screen.getAllByRole('link', { name: 'Sign in' })).toHaveLength(3));
    expect(uploadPhoto).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(3);
  });
});
