'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { safeNextPath } from '@/lib/admin/loginRedirect';
import { inputClass, labelClass, primaryButtonClass } from './styles';

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const { error: signInError } = await createSupabaseBrowserClient().auth.signInWithPassword({
      email: String(form.get('email')),
      password: String(form.get('password')),
    });

    if (signInError) {
      setError(signInError.status === 400 ? 'Invalid email or password.' : "Couldn't sign in right now. Try again.");
      setPending(false);
      return;
    }

    // Read at submit time so the login page itself stays static.
    router.replace(safeNextPath(new URLSearchParams(window.location.search).get('next')));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-[280px] flex-col gap-4">
      <h1 className="mb-2 text-2xl">Sign in</h1>
      <div>
        <label htmlFor="email" className={labelClass}>Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </div>
      {error && <p role="alert" className="text-xs text-[#b00020]">{error}</p>}
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
