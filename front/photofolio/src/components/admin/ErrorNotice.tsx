import Link from 'next/link';
import type { ActionFailure } from '@/lib/admin/types';
import { loginHref } from '@/lib/admin/loginRedirect';

export default function ErrorNotice({ failure }: { failure: ActionFailure | null }) {
  if (!failure) return null;
  return (
    <p role="alert" className="text-xs text-[#b00020]">
      {failure.error}{' '}
      {failure.signedOut && (
        // Failures only exist after a client-side action, so window is always available here.
        <Link href={loginHref(window.location.pathname + window.location.search)} className="underline">
          Sign in
        </Link>
      )}
    </p>
  );
}
