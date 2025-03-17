import { getOffers } from "@/lib/actions/get-offers";
import EmptyContent from "./empty-content";
import FilteredOffers from "./filteredOffers";

export default async function Offers() {
  const data = await getOffers();

  return data.length > 0 ? <FilteredOffers data={data} /> : <EmptyContent />;
}
