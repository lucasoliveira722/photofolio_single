'use client';

import { useState } from 'react';
import type { UploadStatus } from '@/lib/admin/uploadPhoto';
import ErrorNotice from './ErrorNotice';
import { useUploads, type UploadTarget } from './UploadProvider';
import { textButtonClass } from './styles';

const STATUS_LABEL: Record<UploadStatus, string> = {
  waiting: 'Waiting',
  resizing: 'Resizing…',
  uploading: 'Uploading…',
  saving: 'Saving…',
  done: 'Done',
  failed: 'Failed',
};

export default function UploadQueue({ category }: { category: UploadTarget }) {
  const { items, addFiles, retry, clearFinished } = useUploads();
  const [dragOver, setDragOver] = useState(false);

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
          addFiles(event.dataTransfer.files, category);
        }}
        className={`flex cursor-pointer flex-col items-center gap-1 border border-dashed px-6 py-8 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
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
            if (event.target.files) addFiles(event.target.files, category);
            event.target.value = '';
          }}
        />
      </label>

      {items.length > 0 && (
        <ul className="flex flex-col divide-y divide-line border-y border-line text-xs">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
              <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
              {item.category.id !== category.id && <span className="text-muted">to {item.category.name}</span>}
              {item.status === 'failed' && item.failure ? (
                <ErrorNotice failure={item.failure} />
              ) : (
                <span className={item.status === 'done' ? 'text-ink' : 'text-muted'}>{STATUS_LABEL[item.status]}</span>
              )}
              {item.status === 'failed' && item.retryable && (
                <button type="button" onClick={() => retry(item)} className={textButtonClass}>Retry</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasFinished && (
        <button type="button" onClick={clearFinished} className={`${textButtonClass} self-start`}>
          Clear finished
        </button>
      )}
    </div>
  );
}
