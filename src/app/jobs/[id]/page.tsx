import ShareButtons from "@/components/share-buttons";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { getOffer, isOpen, type Offer } from "@/lib/offers";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { formatDate } from "@/lib/utils";
import { ChevronLeft, CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

type Props = { params: Promise<{ id: string }> };

// Shared by generateMetadata and the page: a single database round-trip.
const loadOffer = cache(async (id: string) => {
  await connection();
  return getOffer(id);
});

function summary(offer: Offer) {
  const deadline = formatDate(offer.closes_at);
  return [
    `Poste de ${offer.title} chez ${offer.company}`,
    offer.city && `à ${offer.city}`,
    deadline && isOpen(offer) ? `Candidature avant le ${deadline}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const offer = await loadOffer((await params).id);
  if (!offer) return { title: "Offre introuvable" };

  const title = `${offer.title} - ${offer.company}`;
  const description = summary(offer);
  return {
    title,
    description,
    alternates: { canonical: `/jobs/${offer.id}` },
    robots: isOpen(offer) ? undefined : { index: false },
    openGraph: { title, description, type: "website", url: `/jobs/${offer.id}` },
    twitter: { card: "summary", title, description },
  };
}

/** schema.org JobPosting, so open offers can appear in Google for Jobs. */
function jobPostingJsonLd(offer: Offer) {
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: offer.title,
    description: offer.description_html ?? summary(offer),
    datePosted: offer.published_at ?? offer.first_seen_at.slice(0, 10),
    validThrough: offer.closes_at ?? undefined,
    employmentType:
      offer.contract_type === "CDI"
        ? "FULL_TIME"
        : offer.contract_type === "CDD"
          ? "TEMPORARY"
          : offer.contract_type === "Stage"
            ? "INTERN"
            : offer.contract_type === "Consultance"
              ? "CONTRACTOR"
              : undefined,
    hiringOrganization: { "@type": "Organization", name: offer.company },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: offer.city ?? undefined,
        addressCountry: "CD",
      },
    },
    totalJobOpenings: offer.vacancies ?? undefined,
    url: `${SITE_URL}/jobs/${offer.id}`,
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const offer = await loadOffer(id);
  if (!offer) notFound();
  // Found through its pre-2026 id: send visitors to the canonical URL.
  if (offer.id !== id) permanentRedirect(`/jobs/${offer.id}`);

  const open = isOpen(offer);

  return (
    <main className="min-h-screen main py-10">
      {open && (
        <script
          type="application/ld+json"
          // JSON.stringify output is escaped for "<" to keep it inert inside <script>.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jobPostingJsonLd(offer)).replace(/</g, "\\u003c"),
          }}
        />
      )}

      <Button asChild className="bg-[#f8f7f4] hover:bg-[#fffdf6] text-black rounded-full flex items-center gap-1 w-fit">
        <Link href={open ? "/" : "/history"}>
          <ChevronLeft className="w-4 h-4" aria-hidden />
          <span className="text-[13px] font-[600]">
            {open ? "Toutes les offres" : "Toutes les anciennes offres"}
          </span>
        </Link>
      </Button>

      <div className="mt-[32px] max-w-[1152px] mx-auto flex flex-col md:flex-row gap-[60px]">
        <article className="grow min-w-0">
          {!open && (
            <p className="mb-6 flex items-center gap-2 rounded-lg border border-[#ffbef1] bg-[#fefbfe] p-4 text-sm">
              <CircleAlert className="w-4 h-4 flex-none" aria-hidden />
              Cette offre n&apos;est plus disponible. Elle est conservée dans l&apos;historique à titre
              d&apos;information.
            </p>
          )}
          <span className="block font-mona leading-[22px] text-[16px] font-medium">
            Détails de l&apos;offre
          </span>
          <h1 className="leading-[29px] md:leading-[38px] font-bold text-[24px] md:text-[32px] font-mona">
            {offer.title}
          </h1>
          {open && <ShareButtons url={`${SITE_URL}/jobs/${offer.id}`} title={`${offer.title} - ${offer.company} | ${SITE_NAME}`} />}

          {offer.description_html ? (
            <div
              // Sanitized by the scraper before storage (src/lib/scraper/sanitize.ts).
              dangerouslySetInnerHTML={{ __html: offer.description_html }}
              className="prose max-w-none font-mona mt-[40px] text-[16px] font-[400] leading-[28px] break-words"
            />
          ) : (
            <p className="mt-[40px] text-[#3d3d4e]">
              La description complète est disponible sur le site de l&apos;offre.
            </p>
          )}
        </article>
        <Sidebar offer={offer} open={open} />
      </div>
    </main>
  );
}
