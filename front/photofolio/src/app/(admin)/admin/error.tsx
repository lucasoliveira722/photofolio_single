'use client';

import { textButtonClass } from '@/components/admin/styles';

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-[28px]">Couldn&apos;t load the admin.</h1>
      <p className="max-w-md text-xs text-muted">{error.message}</p>
      <button type="button" onClick={reset} className={textButtonClass}>Try again</button>
    </div>
  );
}
