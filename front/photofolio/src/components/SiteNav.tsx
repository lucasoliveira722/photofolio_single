'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/sale', label: 'Prints' },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="site-nav"
        className="fixed left-4 top-4 z-[60] bg-paper/90 px-3 py-1.5 text-xl leading-none text-ink md:hidden"
      >
        {open ? '✕' : '☰'}
      </button>
      <nav
        id="site-nav"
        aria-label="Main"
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[220px] shrink-0 flex-col justify-between border-r border-line bg-paper px-6 pb-8 pt-16 transition-[transform,visibility] duration-250 ease-out md:visible md:sticky md:top-0 md:translate-x-0 md:pt-8 md:shadow-none ${
          open ? 'visible translate-x-0 shadow-[4px_0_20px_rgba(0,0,0,0.08)]' : 'invisible -translate-x-full'
        }`}
      >
        <Link href="/" onClick={() => setOpen(false)} className="flex flex-col gap-1">
          <span className="font-serif text-lg tracking-[0.04em]">Lucas Oliveira</span>{' '}
          <span className="text-[9px] uppercase tracking-[0.2em] text-muted">Fotografia</span>
        </Link>
        <ul className="flex flex-col gap-1">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                aria-current={pathname === href ? 'page' : undefined}
                className={`block py-1.5 text-[10px] uppercase tracking-[0.18em] transition-colors hover:text-ink ${
                  pathname === href ? 'text-ink' : 'text-muted'
                }`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
