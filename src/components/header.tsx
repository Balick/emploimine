"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NewsLetter from "./newsLetter";

export default function Header() {
  const pathname = usePathname();
  const isHistory = pathname.includes("/history");

  return (
    <div className="main pt-4 flex items-center justify-between">
      <div className="flex gap-8 items-center justify-between md:justify-start w-full">
        <Link href={"/"} className="text-lg md:text-xl">
          EmploisMinesRDC.cd
        </Link>
        <Link
          href={!isHistory ? "/history" : ""}
          className={clsx(isHistory && "font-bold underline")}
        >
          Historique
        </Link>
      </div>
      <div className="hidden md:flex items-center gap-4">
        <label htmlFor="newsletter" className="whitespace-nowrap">
          Resté informé{" "}
          <span className="hidden lg:inline">des nouvelles offres</span>
        </label>
        <NewsLetter />
      </div>
    </div>
  );
}
