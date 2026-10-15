'use client';

import { createContext, useContext, useState } from 'react';
import { uploadPhoto, validateFile, type UploadResult, type UploadStatus } from '@/lib/admin/uploadPhoto';
import type { ActionFailure } from '@/lib/admin/types';

export type UploadTarget = { id: string; name: string };

export type UploadItem = {
  id: string;
  file: File;
  category: UploadTarget;
  status: UploadStatus;
  failure?: ActionFailure;
  retryable: boolean;
};

type Uploads = {
  items: UploadItem[];
  addFiles: (files: FileList | File[], category: UploadTarget) => Promise<void>;
  retry: (item: UploadItem) => Promise<void>;
  clearFinished: () => void;
};

const UploadContext = createContext<Uploads | null>(null);

export function useUploads(): Uploads {
  const uploads = useContext(UploadContext);
  if (!uploads) throw new Error('useUploads must be used inside <UploadProvider>.');
  return uploads;
}

// Holds the upload queue above the per-category view, so switching category doesn't hide uploads in progress.
export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<UploadItem[]>([]);

  function patch(id: string, changes: Partial<UploadItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }

  async function run(item: UploadItem): Promise<UploadResult> {
    let result: UploadResult;
    try {
      result = await uploadPhoto(item.file, item.category.id, (status) => patch(item.id, { status, failure: undefined }));
    } catch {
      result = { ok: false, error: "Couldn't upload this photo. Try again." };
    }
    patch(item.id, result.ok ? { status: 'done' } : { status: 'failed', failure: result, retryable: !result.permanent });
    return result;
  }

  async function addFiles(fileList: FileList | File[], category: UploadTarget) {
    const added: UploadItem[] = Array.from(fileList).map((file) => {
      const invalid = validateFile(file);
      return {
        id: crypto.randomUUID(),
        file,
        category,
        status: invalid ? 'failed' : 'waiting',
        failure: invalid ? { ok: false, error: invalid } : undefined,
        retryable: false,
      };
    });
    setItems((current) => [...current, ...added]);

    // One at a time keeps memory and bandwidth predictable for big batches.
    const pending = added.filter((item) => item.status !== 'failed');
    for (const [index, item] of pending.entries()) {
      const result = await run(item);
      if (!result.ok && result.signedOut) {
        // Every remaining file would fail the same way; mark them so they can be retried after signing in.
        const rest = new Set(pending.slice(index + 1).map((other) => other.id));
        setItems((current) =>
          current.map((other) => (rest.has(other.id) ? { ...other, status: 'failed', failure: result, retryable: true } : other))
        );
        break;
      }
    }
  }

  async function retry(item: UploadItem) {
    await run(item);
  }

  function clearFinished() {
    setItems((current) => current.filter((item) => item.status !== 'done' && item.status !== 'failed'));
  }

  return <UploadContext value={{ items, addFiles, retry, clearFinished }}>{children}</UploadContext>;
}
