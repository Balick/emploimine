import { getOffers } from "@/lib/actions/get-offers";
import { unstable_noStore } from "next/cache";
import EmptyContent from "./empty-content";
import FilteredOffers from "./filteredOffers";

export default async function OldOffers() {
  unstable_noStore();
  const data = await getOffers();

  // Get the current date
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Set time to the beginning of the day for accurate comparison

  const filteredData = data.filter((offer) => {
    // Remove offers with empty descriptions
    if (!offer.description) {
      return false;
    }

    // Check if endDate is present
    if (!offer.endDate) {
      return true; // Keep offers without an end date
    }

    try {
      // Parse the endDate string (dd/mm/yyyy)
      const [day, month, year] = offer.endDate.split("/");
      const expiryDate = new Date(`${year}-${month}-${day}`);
      expiryDate.setHours(0, 0, 0, 0); // Set time to the beginning of the day for accurate comparison

      // Compare expiryDate with currentDate
      return expiryDate < currentDate; // Keep offers where expiryDate is today or in the future
    } catch (error) {
      console.error("Error parsing or comparing date:", error);
      return true; // Keep offers if there's an error parsing the date to avoid losing data
    }
  });

  return data.length > 0 ? (
    <FilteredOffers isOld data={filteredData} />
  ) : (
    <EmptyContent />
  );
}
