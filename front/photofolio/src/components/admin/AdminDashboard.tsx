import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminData } from '@/lib/admin/queries';
import AdminHeader from './AdminHeader';
import CategoryList from './CategoryList';
import NotAuthorized from './NotAuthorized';
import PhotoManager from './PhotoManager';

type AdminDashboardProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function AdminDashboard({ searchParams }: AdminDashboardProps) {
  // Render at request time: the session read uses the clock (token expiry), which can't be prerendered.
  await connection();
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.reason === 'signed-out') redirect('/login');
    return <NotAuthorized />;
  }

  const { category } = await searchParams;
  const { categories, activeCategory, images } = await getAdminData(auth.supabase, category);

  return (
    <div className="min-h-screen">
      <AdminHeader />
      <div className="grid gap-10 px-4 py-8 sm:px-6 md:grid-cols-[240px_1fr] md:px-10">
        <CategoryList categories={categories} activeSlug={activeCategory?.slug ?? null} />
        {activeCategory ? (
          <PhotoManager key={activeCategory.id} category={activeCategory} categories={categories} images={images} />
        ) : (
          <p className="text-muted">Create a category to start adding photos.</p>
        )}
      </div>
    </div>
  );
}
