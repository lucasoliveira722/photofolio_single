import SiteHeader from '@/components/SiteHeader';

export default function SalePage() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-semibold text-black dark:text-white">Prints, coming soon</h1>
        <p className="mt-2 max-w-md text-zinc-600 dark:text-zinc-400">
          This page will let you buy prints of my work. It&apos;s not ready yet &mdash; check back soon.
        </p>
      </main>
    </div>
  );
}
