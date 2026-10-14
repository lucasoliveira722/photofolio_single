import Link from "next/link";

type SiteHeaderProps = {
  titleAs?: "h1" | "p";
};

export default function SiteHeader({ titleAs: Title = "p" }: SiteHeaderProps) {
  return (
    <header className="flex w-full max-w-5xl items-center justify-between">
      <Title className="text-xl font-semibold text-black dark:text-white">
        <Link href="/">Lucas Oliveira Fotografia</Link>
      </Title>
      <nav className="flex gap-4 text-black dark:text-white">
        <Link href="/portfolio">Portfolio</Link>
        <Link href="/sale">Prints</Link>
      </nav>
    </header>
  );
}
