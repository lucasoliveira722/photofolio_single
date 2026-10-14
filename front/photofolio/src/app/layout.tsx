import type { Metadata } from "next";
import { Cormorant_Garamond, Geist } from "next/font/google";
import SiteNav from "@/components/SiteNav";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lucas Oliveira Fotografia",
  description: "Photography portfolio of Lucas Oliveira",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${cormorant.variable} h-full antialiased`}>
      <body className="flex min-h-full">
        <SiteNav />
        <main className="min-w-0 flex-1">{children}</main>
      </body>
    </html>
  );
}
