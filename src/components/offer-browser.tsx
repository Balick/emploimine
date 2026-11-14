import { SearchProvider } from "@/context/search-context";
import { getOpenOffers, getPastOffers, today, type OfferSummary } from "@/lib/offers";
import { CONTRACT_TYPES } from "@/lib/scraper/constants";
import { connection } from "next/server";
import Aside from "./aside";
import FilterButton from "./FilterBtn";
import type { FilterOption } from "./FormContent";
import OfferList from "./offer-list";
import SearchBar from "./searchbar";

function countBy(offers: OfferSummary[], key: (offer: OfferSummary) => string | null) {
  const counts = new Map<string, number>();
  for (const offer of offers) {
    const value = key(offer);
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function filterOptions(offers: OfferSummary[]) {
  const companies: FilterOption[] = [...countBy(offers, (o) => o.company)]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"))
    .map(([value, count]) => ({ value, label: value, count }));

  const contractCounts = countBy(offers, (o) => o.contract_type);
  const contracts: FilterOption[] = CONTRACT_TYPES.filter((type) => contractCounts.has(type)).map((type) => ({
    value: type,
    label: type,
    count: contractCounts.get(type)!,
  }));

  return { companies, contracts };
}

/** Search bar, filters and list of offers. */
export default async function OfferBrowser({
  variant,
  title,
  headingLevel: Heading = "h2",
}: {
  variant: "open" | "past";
  title: string;
  /** "h1" when the list is the main content of the page. */
  headingLevel?: "h1" | "h2";
}) {
  await connection();
  const offers = variant === "open" ? await getOpenOffers() : await getPastOffers();
  const options = filterOptions(offers);

  return (
    <SearchProvider>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
        <div>
          <SearchBar />
          <section aria-labelledby="offers-title">
            <div className="flex items-center justify-between my-[40px]">
              <Heading id="offers-title" className="font-mona font-bold leading-[24px] text-lg">
                {title} <span className="font-normal text-[#6e6d7a]">({offers.length})</span>
              </Heading>
              <FilterButton {...options} />
            </div>
            <OfferList offers={offers} today={today()} />
          </section>
        </div>
        <Aside {...options} />
      </div>
    </SearchProvider>
  );
}
