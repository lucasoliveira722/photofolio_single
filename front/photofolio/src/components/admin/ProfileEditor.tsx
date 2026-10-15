import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getProfile } from '@/lib/api';
import { loginHref } from '@/lib/admin/loginRedirect';
import AdminHeader from './AdminHeader';
import NotAuthorized from './NotAuthorized';
import ProfileForm from './ProfileForm';

export default async function ProfileEditor() {
  // Render at request time: the session read uses the clock (token expiry), which can't be prerendered.
  await connection();
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.reason === 'signed-out') redirect(loginHref('/admin/profile'));
    if (auth.reason === 'error') throw new Error(`Couldn't check your account: ${auth.message}`);
    return <NotAuthorized />;
  }

  const profile = await getProfile();

  return (
    <div className="min-h-screen">
      <AdminHeader />
      <div className="px-4 py-8 sm:px-6 md:px-10">
        <h1 className="mb-2 text-2xl">Profile</h1>
        <p className="mb-8 text-[13px] text-muted">The bio and contact links on the home page.</p>
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
