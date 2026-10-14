'use client';

import { useState } from 'react';
import { uploadPhoto, validateFile, type UploadStatus } from '@/lib/admin/uploadPhoto';
import type { ActionFailure, ActionResult } from '@/lib/admin/types';
import ErrorNotice from './ErrorNotice';
import { textButtonClass } from './styles';

type QueueItem = {
  id: string;
  file: File;
  status: UploadStatus;
  failure?: ActionFailure;
  retryable: boolean;
};

const STATUS_LABEL: Record<UploadStatus, string> = {
  resizing: 'Resizing…',
  uploading: 'Uploading…',
  saving: 'Saving…',
  done: 'Done',
  failed: 'Failed',
};

export default function UploadQueue({ categoryId }: { categoryId: string }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [dragOver, setDragOver] = useState(false);

  function patch(id: string, changes: Partial<QueueItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }

  async function run(item: QueueItem): Promise<ActionResult> {
    let result: ActionResult;
    try {
      result = await uploadPhoto(item.file, categoryId, (status) => patch(item.id, { status, failure: undefined }));
    } catch {
      result = { ok: false, error: "Couldn't upload this photo. Try again." };
    }
    patch(item.id, result.ok ? { status: 'done' } : { status: 'failed', failure: result, retryable: true });
    return result;
  }

  async function addFiles(fileList: FileList | File[]) {
    const added: QueueItem[] = Array.from(fileList).map((file) => {
      const invalid = validateFile(file);
      return {
        id: crypto.randomUUID(),
        file,
        status: invalid ? 'failed' : 'resizing',
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

  const hasFinished = items.some((item) => item.status === 'done' || item.status === 'failed');

  return (
    <div className="flex flex-col gap-3">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          addFiles(event.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center gap-1 border border-dashed px-6 py-8 text-center transition-colors ${
          dragOver ? 'border-ink bg-white/60' : 'border-line hover:border-muted'
        }`}
      >
        <span className="text-[10px] uppercase tracking-[0.18em]">+ Add photos</span>
        <span className="text-xs text-muted">Choose files or drop them here. They&apos;re resized before uploading.</span>
        <input
          type="file"
          accept="image/*"
          multiple
          aria-label="Add photos"
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = '';
          }}
        />
      </label>

      {items.length > 0 && (
        <ul className="flex flex-col divide-y divide-line border-y border-line text-xs">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
              <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
              {item.status === 'failed' && item.failure ? (
                <ErrorNotice failure={item.failure} />
              ) : (
                <span className={item.status === 'done' ? 'text-ink' : 'text-muted'}>{STATUS_LABEL[item.status]}</span>
              )}
              {item.status === 'failed' && item.retryable && (
                <button type="button" onClick={() => run(item)} className={textButtonClass}>Retry</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasFinished && (
        <button
          type="button"
          onClick={() => setItems((current) => current.filter((item) => item.status !== 'done' && item.status !== 'failed'))}
          className={`${textButtonClass} self-start`}
        >
          Clear finished
        </button>
      )}
    </div>
  );
}
