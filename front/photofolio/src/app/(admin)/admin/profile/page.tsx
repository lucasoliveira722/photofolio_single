import { Suspense } from 'react';
import type { Metadata } from 'next';
import ProfileEditor from '@/components/admin/ProfileEditor';

export const metadata: Metadata = {
  title: 'Profile · Admin · Lucas Oliveira',
  robots: { index: false },
};

export default function AdminProfilePage() {
  // The editor reads the session cookie, which must happen inside Suspense with Cache Components.
  return (
    <Suspense fallback={<p className="p-10 text-muted">Loading…</p>}>
      <ProfileEditor />
    </Suspense>
  );
}
