import "server-only";
import { today } from "@/lib/dates";
import type { ContractType } from "@/lib/scraper/constants";
import { getPublicClient } from "@/lib/supabase";
import { postedAt } from "@/lib/utils";

export { isOpen, today } from "@/lib/dates";

export type Offer = {
  id: string;
  source: string;
  title: string;
  company: string;
  url: string;
  location: string | null;
  city: string | null;
  contract_type: ContractType | null;
  description_html: string | null;
  level: string | null;
  vacancies: number | null;
  published_at: string | null;
  closes_at: string | null;
  first_seen_at: string;
  removed_at: string | null;
  legacy_id: string | null;
};

/** Fields needed by offer lists (descriptions are heavy, keep them out). */
export type OfferSummary = Pick<
  Offer,
  "id" | "title" | "company" | "city" | "location" | "contract_type" | "published_at" | "closes_at" | "first_seen_at"
>;

const SUMMARY_COLUMNS =
  "id, title, company, city, location, contract_type, published_at, closes_at, first_seen_at";

/** Supabase returns at most 1000 rows per request. */
const MAX_OFFERS = 1000;

/** Newest first, by the date shown to users ("Posté il y a…"). */
const byPostedDate = (a: OfferSummary, b: OfferSummary) => postedAt(b).localeCompare(postedAt(a));

export async function getOpenOffers(): Promise<OfferSummary[]> {
  const { data, error } = await getPublicClient()
    .from("offers")
    .select(SUMMARY_COLUMNS)
    .is("removed_at", null)
    .or(`closes_at.is.null,closes_at.gte.${today()}`)
    .order("first_seen_at", { ascending: false })
    .limit(MAX_OFFERS);
  if (error) throw new Error(`Impossible de récupérer les offres : ${error.message}`);
  return data.sort(byPostedDate);
}

export async function getPastOffers(): Promise<OfferSummary[]> {
  const { data, error } = await getPublicClient()
    .from("offers")
    .select(SUMMARY_COLUMNS)
    .or(`removed_at.not.is.null,closes_at.lt.${today()}`)
    .order("first_seen_at", { ascending: false })
    .limit(MAX_OFFERS);
  if (error) throw new Error(`Impossible de récupérer l'historique : ${error.message}`);
  return data.sort(byPostedDate);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One offer with its description, or `null` if it does not exist. Ids from
 * the pre-2026 database (`legacy_id`) are resolved too, so old links work.
 */
export async function getOffer(id: string): Promise<Offer | null> {
  if (!/^[\w-]{1,64}$/.test(id)) return null;
  const db = getPublicClient();

  if (UUID.test(id)) {
    const { data, error } = await db.from("offers").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`Impossible de récupérer l'offre : ${error.message}`);
    if (data) return data;
  }

  const { data, error } = await db.from("offers").select("*").eq("legacy_id", id).maybeSingle();
  if (error) throw new Error(`Impossible de récupérer l'offre : ${error.message}`);
  return data;
}

/** Open offers for the sitemap (closed ones are `noindex`). */
export async function getOfferIdsForSitemap(): Promise<{ id: string; first_seen_at: string }[]> {
  const { data, error } = await getPublicClient()
    .from("offers")
    .select("id, first_seen_at")
    .is("removed_at", null)
    .or(`closes_at.is.null,closes_at.gte.${today()}`)
    .order("first_seen_at", { ascending: false })
    .limit(MAX_OFFERS);
  if (error) throw new Error(error.message);
  return data;
}
