import SiteNav from '@/components/SiteNav';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <SiteNav />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
