import Link from "next/link";
import NewsLetter from "./newsLetter";

export default function Footer() {
  return (
    <div className="flex flex-col justify-center gap-8">
      <div className="flex md:hidden flex-col items-center gap-2">
        <label htmlFor="newsletter">
          Resté informé <span className="lg:hidden">des nouvelles offres</span>
        </label>
        <NewsLetter />
      </div>
      <footer className="main flex-none w-full flex flex-col gap-2 md:flex-row items-center justify-center md:justify-between mb-8">
        <Link href={"/"} className="text-2xl">
          EmploisMinesRDC.cd
        </Link>
        <span className="text-center">
          Copyright © {new Date().getFullYear()} EmploisMinesRDC.cd. Tous droits
          réservés.
        </span>
      </footer>
    </div>
  );
}
