"use client";

import { useSearchContext } from "@/context/search-context";
import type { OfferSummary } from "@/lib/offers";
import { formatShortDate, getElapsedTime, postedAt } from "@/lib/utils";
import { Dot, MapPin } from "lucide-react";
import Link from "next/link";
import { Fragment, useMemo } from "react";
import CompanyLogo from "./company-logo";
import EmptyContent from "./empty-content";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function HighlightedText({ text, term }: { text: string; term: string }) {
  const trimmed = term.trim();
  if (!trimmed) return <>{text}</>;

  const parts = text.split(new RegExp(`(${escapeRegExp(trimmed)})`, "gi"));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200">
            {part}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        )
      )}
    </>
  );
}

export default function OfferList({
  offers,
  today,
}: {
  offers: OfferSummary[];
  /** Server's DRC date (YYYY-MM-DD): relative dates must not depend on the visitor's clock. */
  today: string;
}) {
  const { term, filters } = useSearchContext();

  const filtered = useMemo(() => {
    const words = normalize(term).split(/\s+/).filter(Boolean);
    return offers.filter((offer) => {
      const haystack = normalize(`${offer.title} ${offer.company} ${offer.city ?? ""} ${offer.location ?? ""}`);
      return (
        words.every((word) => haystack.includes(word)) &&
        (!filters.companies.length || filters.companies.includes(offer.company)) &&
        (!filters.contracts.length || (offer.contract_type !== null && filters.contracts.includes(offer.contract_type)))
      );
    });
  }, [offers, term, filters]);

  // Always mounted, so screen readers also hear when a search has no result.
  const announcement = filtered.length
    ? `${filtered.length} offre(s) affichée(s)`
    : offers.length
      ? "Aucune offre ne correspond à votre recherche"
      : "Aucune offre disponible";

  return (
    <>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {!filtered.length && <EmptyContent filtered={offers.length > 0} />}
      <ul className="flex flex-col gap-4" hidden={!filtered.length}>
        {filtered.map((offer) => {
          const place = offer.city ?? offer.location;
          const deadline = formatShortDate(offer.closes_at);
          return (
            <li
              key={offer.id}
              className="hover:bg-[#fefbfe] py-5 px-[10px] border border-[#f1f1f1] rounded-lg hover:shadow-xs transition-all duration-300"
            >
              <Link href={`/jobs/${offer.id}`} className="flex items-center gap-2 justify-between">
                <div className="flex items-center w-full md:w-[75%] min-w-0">
                  <CompanyLogo company={offer.company} className="mr-4" />
                  <div className="flex flex-col gap-1.5 overflow-hidden min-w-0">
                    <span className="truncate">{offer.company}</span>
                    <h3 className="font-semibold truncate">
                      <HighlightedText text={offer.title} term={term} />
                    </h3>
                    <div className="flex items-center gap-0.5 text-sm text-[#3d3d4e]">
                      {offer.contract_type && (
                        <>
                          <span>{offer.contract_type}</span>
                          <Dot className="w-5 h-5 flex-none" aria-hidden />
                        </>
                      )}
                      {deadline ? (
                        <span className="hidden md:block">Date limite : {deadline}</span>
                      ) : (
                        <span className="hidden md:block">Sans date limite</span>
                      )}
                      {place && <span className="md:hidden truncate">{place}</span>}
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex flex-col justify-between items-end gap-[20px] w-max flex-none">
                  <span className="text-[#6e6d7a] text-sm">
                    Posté {getElapsedTime(postedAt(offer), today).toLowerCase()}
                  </span>
                  {place && (
                    <div className="items-center gap-1 flex">
                      <MapPin className="w-3 h-3" aria-hidden />
                      <span className="font-bold text-xs text-nowrap">{place}</span>
                    </div>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
