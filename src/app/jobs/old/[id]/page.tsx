import { permanentRedirect } from "next/navigation";

/** Offers used to have a separate page once expired; keep old links working. */
export default async function LegacyOldOfferPage({ params }: { params: Promise<{ id: string }> }) {
  permanentRedirect(`/jobs/${(await params).id}`);
}
