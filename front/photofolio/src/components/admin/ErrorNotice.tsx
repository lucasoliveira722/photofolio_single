import Link from 'next/link';
import type { ActionFailure } from '@/lib/admin/types';

export default function ErrorNotice({ failure }: { failure: ActionFailure | null }) {
  if (!failure) return null;
  return (
    <p role="alert" className="text-xs text-[#b00020]">
      {failure.error}{' '}
      {failure.signedOut && (
        <Link href="/login" className="underline">
          Sign in
        </Link>
      )}
    </p>
  );
}
