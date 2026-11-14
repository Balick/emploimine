/**
 * Step 3 of the migration from the pre-2026 database (see
 * supabase/legacy/migrate-from-v0.sql): copy `offers_legacy` and
 * `emails_legacy` into the new schema.
 *
 *   npm run migrate:legacy -- --dry-run   # print what would be imported
 *   npm run migrate:legacy
 *
 * Old offers become history (removed, already notified). Descriptions go
 * through the same sanitizer as scraped offers, because the old table was
 * writable with the public key. Old ids are kept in `legacy_id`, so links
 * shared before the migration (/jobs/<old id>) redirect to the new page.
 * Safe to run twice: existing rows are left untouched.
 */
import { parseArgs } from "node:util";
import { sanitizeDescription } from "@/lib/scraper/sanitize";
import { selectAll } from "@/lib/scraper/store";
import { parseDate } from "@/lib/scraper/utils";
import { getAdminClient } from "@/lib/supabase";

const { values } = parseArgs({ options: { "dry-run": { type: "boolean", default: false } } });

type LegacyOffer = {
  id: string | number;
  title: string | null;
  company: string | null;
  link: string | null;
  location: string | null;
  city: string | null;
  type: string | null;
  description: string | null;
  level: string | null;
  vacantPost: number | null;
  date: string | null;
  endDate: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const blank = (value: string | null | undefined) => {
  const text = value?.trim();
  return text && text !== "-" ? text : null;
};

function isHttpUrl(value: string | null): value is string {
  try {
    return ["http:", "https:"].includes(new URL(value ?? "").protocol);
  } catch {
    return false;
  }
}

async function main() {
  const db = getAdminClient();
  const now = new Date().toISOString();

  const legacyOffers = await selectAll<LegacyOffer>((from, to) =>
    db.from("offers_legacy").select("*").order("id").range(from, to)
  );
  const seen = new Set<string>();
  const offers = legacyOffers.flatMap((offer) => {
    const title = blank(offer.title);
    if (!title || !isHttpUrl(offer.link) || seen.has(offer.link)) return [];
    seen.add(offer.link);
    const legacyId = String(offer.id);
    const type = blank(offer.type)?.toUpperCase();
    return [
      {
        ...(UUID.test(legacyId) ? { id: legacyId } : {}),
        legacy_id: legacyId,
        source: "legacy",
        external_id: offer.link,
        title,
        company: blank(offer.company) ?? "Entreprise non précisée",
        url: offer.link,
        location: blank(offer.location),
        city: blank(offer.city),
        contract_type: type === "CDI" || type === "CDD" ? type : null,
        description_html: sanitizeDescription(offer.description),
        level: blank(offer.level),
        vacancies: offer.vacantPost && offer.vacantPost > 0 ? offer.vacantPost : null,
        published_at: parseDate(offer.date),
        closes_at: parseDate(offer.endDate),
        removed_at: now,
        notified_at: now,
      },
    ];
  });

  const legacyEmails = await selectAll<{ email: string | null }>((from, to) =>
    db.from("emails_legacy").select("email").order("email").range(from, to)
  );
  const emails = [
    ...new Set(legacyEmails.map((row) => row.email?.trim().toLowerCase()).filter((e): e is string => !!e && EMAIL.test(e))),
  ];

  console.log(`Offres : ${legacyOffers.length} anciennes, ${offers.length} à importer.`);
  console.log(`Abonnés : ${legacyEmails.length} anciens, ${emails.length} adresses valides à importer.`);
  if (values["dry-run"]) return;

  for (let i = 0; i < offers.length; i += 200) {
    const { error } = await db
      .from("offers")
      // defaultToNull: false -> rows without an `id` get the column default.
      .upsert(offers.slice(i, i + 200), { onConflict: "source,external_id", ignoreDuplicates: true, defaultToNull: false });
    if (error) throw error;
  }

  // They had already subscribed with the old version: keep them confirmed.
  for (let i = 0; i < emails.length; i += 500) {
    const { error } = await db.from("subscribers").upsert(
      emails.slice(i, i + 500).map((email) => ({ email, confirmed_at: now })),
      { onConflict: "email", ignoreDuplicates: true }
    );
    if (error) throw error;
  }

  console.log("Migration terminée. Vérifiez le site, puis supprimez offers_legacy et emails_legacy.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
