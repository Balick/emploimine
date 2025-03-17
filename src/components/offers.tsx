import { getOffers } from "@/lib/actions/get-offers";
import { unstable_noStore } from "next/cache";
import EmptyContent from "./empty-content";
import FilteredOffers from "./filteredOffers";

export default async function Offers() {
  unstable_noStore();
  const data = await getOffers();

  return data.length > 0 ? <FilteredOffers data={data} /> : <EmptyContent />;
}
