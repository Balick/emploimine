import { getAdminClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SourceResult } from "./run";

/** PostgREST returns at most this many rows per request (Supabase default max_rows). */
const PAGE_SIZE = 1000;
/** Ids per `.in()` filter, to keep request URLs short. */
const ID_CHUNK = 100;
/** Rows per upsert request. */
const UPSERT_CHUNK = 200;

const chunk = <T>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

/** Read every row of a query, page by page (a plain select stops at 1000 rows). */
export async function selectAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

export type StoreSummary = {
  source: string;
  seen: number;
  inserted: number;
  removed: number;
  firstRun: boolean;
  error?: string;
};

async function storeSource(db: SupabaseClient, result: SourceResult): Promise<StoreSummary> {
  const source = result.source.id;
  const now = new Date().toISOString();

  const { count, error: countError } = await db
    .from("offers")
    .select("id", { count: "exact", head: true })
    .eq("source", source);
  if (countError) throw countError;
  const firstRun = count === 0;

  // Which of the current offers do we already know? Only those are fetched,
  // never the whole (ever-growing) history of the source.
  const currentIds = result.jobs.map((job) => job.externalId);
  const known = new Set<string>();
  for (const ids of chunk(currentIds, ID_CHUNK)) {
    const { data, error } = await db.from("offers").select("external_id").eq("source", source).in("external_id", ids);
    if (error) throw error;
    for (const row of data) known.add(row.external_id);
  }

  const rows = result.jobs.map((job) => ({
    source,
    external_id: job.externalId,
    title: job.title,
    company: job.company,
    url: job.url,
    location: job.location ?? null,
    city: job.city ?? null,
    contract_type: job.contractType ?? null,
    description_html: job.descriptionHtml ?? null,
    level: job.level ?? null,
    vacancies: job.vacancies ?? null,
    published_at: job.publishedAt ?? null,
    closes_at: job.closesAt ?? null,
    last_seen_at: now,
    removed_at: null,
    // first_seen_at and notified_at are left out: their defaults apply on
    // insert and existing values are kept on update.
  }));
  for (const batch of chunk(rows, UPSERT_CHUNK)) {
    const { error } = await db.from("offers").upsert(batch, { onConflict: "source,external_id" });
    if (error) throw error;
  }

  // Offers still open in the database but no longer listed by the source.
  // Offers rejected by validation are still listed: they are not "gone".
  const listed = new Set([...currentIds, ...result.rejected.flatMap((r) => (r.externalId ? [r.externalId] : []))]);
  const open = await selectAll<{ id: string; external_id: string }>((from, to) =>
    db.from("offers").select("id, external_id").eq("source", source).is("removed_at", null).order("id").range(from, to)
  );
  const gone = open.filter((row) => !listed.has(row.external_id)).map((row) => row.id);
  for (const ids of chunk(gone, ID_CHUNK)) {
    const { error } = await db.from("offers").update({ removed_at: now }).in("id", ids);
    if (error) throw error;
  }

  // First run of a source (empty database or newly added source): import its
  // backlog silently, otherwise every subscriber gets one huge email.
  if (firstRun) {
    const { error } = await db.from("offers").update({ notified_at: now }).eq("source", source).is("notified_at", null);
    if (error) throw error;
  }

  return { source, seen: rows.length, inserted: rows.length - known.size, removed: gone.length, firstRun };
}

/**
 * Persist scraping results, source by source:
 *  - upsert every offer (keyed on source + external_id) and mark it as seen;
 *  - mark offers that disappeared from a *successful* source as removed;
 *  - new offers keep `notified_at = null` until the newsletter sends them.
 * Offers of failed sources are left untouched, and an error while storing
 * one source does not prevent the others from being stored.
 */
export async function storeResults(results: SourceResult[]): Promise<StoreSummary[]> {
  const db = getAdminClient();
  const summaries: StoreSummary[] = [];

  for (const result of results) {
    if (!result.ok) continue;
    try {
      const summary = await storeSource(db, result);
      summaries.push(summary);
      console.error(
        `[${summary.source}] ${summary.seen} vue(s), ${summary.inserted} nouvelle(s), ${summary.removed} retirée(s)` +
          (summary.firstRun ? " — première exécution : import sans notification" : "")
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      summaries.push({ source: result.source.id, seen: 0, inserted: 0, removed: 0, firstRun: false, error: message });
      console.error(`[${result.source.id}] échec de l'enregistrement : ${message}`);
    }
  }

  return summaries;
}
