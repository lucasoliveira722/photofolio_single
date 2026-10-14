import { signOut } from '@/app/(admin)/admin/actions';
import { textButtonClass } from './styles';

export default function NotAuthorized() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-[28px]">This account isn&apos;t authorized.</h1>
      <p className="text-xs text-muted">Only the site owner can use the admin.</p>
      <form action={signOut}>
        <button type="submit" className={textButtonClass}>Sign out</button>
      </form>
    </div>
  );
}
