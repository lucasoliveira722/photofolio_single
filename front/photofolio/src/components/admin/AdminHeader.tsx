import Link from 'next/link';
import { signOut } from '@/app/(admin)/admin/actions';
import { textButtonClass } from './styles';

export default function AdminHeader() {
  return (
    <header className="flex items-center justify-between border-b border-line px-4 py-5 sm:px-6 md:px-10">
      <p className="flex items-baseline gap-3">
        <span className="font-serif text-lg tracking-[0.04em]">Lucas Oliveira</span>
        <span className="text-[9px] uppercase tracking-[0.2em] text-muted">Admin</span>
      </p>
      <nav className="flex items-center gap-6">
        <Link href="/admin" className={textButtonClass}>Photos</Link>
        <Link href="/admin/profile" className={textButtonClass}>Profile</Link>
        <Link href="/" className={textButtonClass}>View site</Link>
        <form action={signOut}>
          <button type="submit" className={textButtonClass}>Sign out</button>
        </form>
      </nav>
    </header>
  );
}
