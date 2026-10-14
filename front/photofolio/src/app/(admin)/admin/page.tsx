import { Suspense } from 'react';
import type { Metadata } from 'next';
import AdminDashboard from '@/components/admin/AdminDashboard';

export const metadata: Metadata = {
  title: 'Admin · Lucas Oliveira',
  robots: { index: false },
};

type AdminPageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default function AdminPage({ searchParams }: AdminPageProps) {
  // The dashboard reads the session cookie, which must happen inside Suspense with Cache Components.
  return (
    <Suspense fallback={<p className="p-10 text-muted">Loading…</p>}>
      <AdminDashboard searchParams={searchParams} />
    </Suspense>
  );
}
