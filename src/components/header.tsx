"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NewsLetter from "./newsLetter";

export default function Header() {
  const pathname = usePathname();
  const isHistory = pathname.startsWith("/history");

  return (
    <header className="main pt-4 flex items-center justify-between gap-4">
      <nav aria-label="Navigation principale" className="flex gap-8 items-center justify-between md:justify-start w-full">
        <Link href="/" className="text-lg md:text-xl">
          EmploisMinesRDC.cd
        </Link>
        <Link
          href="/history"
          aria-current={isHistory ? "page" : undefined}
          className={clsx(isHistory && "font-bold underline")}
        >
          Historique
        </Link>
      </nav>
      <div className="hidden md:flex items-center gap-4">
        <label htmlFor="newsletter-header" className="whitespace-nowrap">
          Restez informé <span className="hidden lg:inline">des nouvelles offres</span>
        </label>
        <NewsLetter id="newsletter-header" />
      </div>
    </header>
  );
}
