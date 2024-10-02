import Link from "next/link";

export default function Footer() {
  return (
    <footer className="main flex flex-col gap-2 md:flex-row items-center justify-center md:justify-between mb-8">
      <Link href={"/"} className="text-2xl">
        EmploisMinesRDC.cd
      </Link>
      <span className="text-center">
        Copyright © {new Date().getFullYear()} EmploisMinesRDC.cd. Tous droits
        réservés.
      </span>
    </footer>
  );
}
