import { REPOSITORY_URL } from "@/lib/site";
import Link from "next/link";
import NewsLetter from "./newsLetter";

export default function Footer() {
  return (
    <div className="flex flex-col justify-center gap-8">
      <div className="flex md:hidden flex-col items-center gap-2">
        <label htmlFor="newsletter-footer">
          Restez informé <span className="lg:hidden">des nouvelles offres</span>
        </label>
        <NewsLetter id="newsletter-footer" />
      </div>
      <footer className="main flex-none w-full flex flex-col gap-2 md:flex-row items-center justify-center md:justify-between mb-8">
        <Link href="/" className="text-2xl">
          EmploisMinesRDC.cd
        </Link>
        <p className="text-center text-sm text-[#3d3d4e]">
          Projet open source :{" "}
          <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className="underline">
            contribuez sur GitHub
          </a>
          . © {new Date().getFullYear()} EmploisMinesRDC.cd
        </p>
      </footer>
    </div>
  );
}
