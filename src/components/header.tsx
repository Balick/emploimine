import Link from "next/link";
import NewsLetter from "./newsLetter";

export default function Header() {
  return (
    <div className="main pt-4 flex items-center justify-between">
      <Link href={"/"} className="text-lg md:text-xl">
        EmploisMinesRDC.cd
      </Link>
      <div className="hidden md:flex items-center gap-4">
        <label htmlFor="newsletter">
          Resté informé{" "}
          <span className="hidden lg:inline">des nouvelles offres</span>
        </label>
        <NewsLetter />
      </div>
    </div>
  );
}
