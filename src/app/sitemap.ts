import { getOfferIdsForSitemap } from "@/lib/offers";
import { SITE_URL } from "@/lib/site";
import type { MetadataRoute } from "next";

// Regenerated at most once an hour.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const offers = await getOfferIdsForSitemap().catch(() => []);
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/history`, changeFrequency: "daily", priority: 0.5 },
    ...offers.map((offer) => ({
      url: `${SITE_URL}/jobs/${offer.id}`,
      lastModified: offer.first_seen_at,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
