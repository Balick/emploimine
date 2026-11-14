import { z } from "zod";
import { CONTRACT_TYPES, type SourceKind } from "./constants";
import type { Http } from "./http";

export { CONTRACT_TYPES, SOURCE_KINDS, type ContractType, type SourceKind } from "./constants";

/** A calendar date in ISO format (YYYY-MM-DD). */
const isoDate = z.iso.date();

/**
 * A job offer as returned by a source, before it is stored.
 *
 * Only `externalId`, `title`, `company` and `url` are required. Leave a field
 * `null` (or omit it) rather than guessing: the UI handles missing values.
 */
export const scrapedJobSchema = z.object({
  /** Stable identifier of the offer *within its source* (ATS id, slug, URL…). */
  externalId: z.string().trim().min(1),
  title: z.string().trim().min(2),
  /** Hiring company as it should be displayed (e.g. "Kamoto Copper Company"). */
  company: z.string().trim().min(1),
  /** Public page of the offer, where candidates can read and apply. */
  url: z.url(),
  /** Raw location text, e.g. "Kolwezi, Lualaba, RDC". */
  location: z.string().trim().min(1).nullish(),
  city: z.string().trim().min(1).nullish(),
  contractType: z.enum(CONTRACT_TYPES).nullish(),
  /** Description as HTML. It is sanitized by the runner, return it raw. */
  descriptionHtml: z.string().nullish(),
  publishedAt: isoDate.nullish(),
  closesAt: isoDate.nullish(),
  vacancies: z.number().int().positive().nullish(),
  level: z.string().trim().min(1).nullish(),
});

export type ScrapedJob = z.input<typeof scrapedJobSchema>;
export type NormalizedJob = z.output<typeof scrapedJobSchema>;

export interface ScrapeContext {
  /** Polite HTTP client: identifies the bot, retries, times out, rate limits. */
  http: Http;
  /** Log a progress message, prefixed with the source id. */
  log: (message: string) => void;
}

export interface Source {
  /** Unique kebab-case id, also the file name in `sources/` (e.g. "kobold-metals"). */
  id: string;
  /** Display name of the organisation behind the source. */
  name: string;
  /** Public careers page, shown to users and used in docs. */
  website: string;
  kind: SourceKind;
  /** Override the default 5 min budget (e.g. for sites with a long Crawl-delay). */
  timeoutMs?: number;
  /**
   * Return the offers located in the DRC that are currently open. Throw if the
   * source is unreachable or its structure changed: the runner isolates
   * failures so one broken source never blocks the others.
   */
  scrape: (ctx: ScrapeContext) => Promise<ScrapedJob[]>;
}

/** Identity helper that gives `Source` objects full type inference. */
export function defineSource(source: Source): Source {
  return source;
}
