import { cn } from "@/lib/utils";
import Image from "next/image";

/** Logos available in /public, keyed by a lowercase fragment of the company name. */
const LOGOS: { match: RegExp; src: string; large?: string }[] = [
  { match: /kamoto|\bkcc\b/i, src: "/kcc-logo-2.jpeg", large: "/kcc-logo.jpeg" },
  { match: /glencore|mutanda/i, src: "/glencore.webp", large: "/Glencore_logo.svg" },
];

function initials(name: string) {
  return name
    .replace(/\(.*?\)/g, "")
    .split(/[\s-]+/)
    .filter((word) => /^[A-Za-zÀ-ÿ]/.test(word))
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

export default function CompanyLogo({
  company,
  size = 46,
  large = false,
  className,
}: {
  company: string;
  size?: number;
  /** Use the wide version of the logo when there is one (offer sidebar). */
  large?: boolean;
  className?: string;
}) {
  const logo = LOGOS.find((entry) => entry.match.test(company));

  if (logo) {
    return (
      <div
        className={cn("relative overflow-hidden rounded-[4px] flex-none", className)}
        style={{ width: large ? size * 3 : size, height: size }}
      >
        <Image
          src={large ? (logo.large ?? logo.src) : logo.src}
          alt={`Logo ${company}`}
          fill
          sizes={`${large ? size * 3 : size}px`}
          className="object-contain"
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className={cn(
        "flex flex-none items-center justify-center rounded-[4px] bg-[#fbe8f7] font-mona font-bold text-[#0d0c22]",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(company) || "?"}
    </div>
  );
}
