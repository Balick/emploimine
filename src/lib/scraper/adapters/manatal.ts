import * as cheerio from "cheerio";
import type { ScrapeContext, ScrapedJob } from "../types";
import { clean, findDrcCity, isInDrc, normalizeContractType } from "../utils";

/**
 * Manatal career pages (www.careers-page.com/{slug}), read through the JSON
 * API the page itself calls (no key needed):
 * `GET /api/v1.0/c/{slug}/jobs/?page_size=20`, paginated with `next`
 * (page_size is capped at 20 server side).
 *
 * Each result carries the title, the structured location and the full HTML
 * description, so no detail page is fetched. There is no publication date,
 * deadline or contract field: recruiters write those as "Label : value" lines
 * in the description, which we read for the contract type and the place of
 * work (see workLocation).
 *
 * Quirk: Manatal's country list labels the DRC "Republic of the Congo". Every
 * such offer seen so far has a DRC city (Kolwezi, Lubumbashi, Kinshasa…), and
 * isInDrc() keeps them on the city while rejecting a real Brazzaville offer.
 * The country name is corrected in the displayed location.
 */

const BASE = "https://www.careers-page.com";

type ManatalJob = {
  id: number;
  /** Public job code, used in the offer URL and shown as "Job Reference". */
  hash: string;
  position_name: string;
  /** HTML. */
  description: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  location_display: string | null;
};

type ManatalPage = {
  count: number;
  next: string | null;
  results: ManatalJob[];
};

/** What a source-specific relevance filter can look at. */
export type ManatalOffer = {
  title: string;
  /** Description as plain-text lines (one per paragraph / list item). */
  lines: string[];
};

/** Plain-text lines of an HTML description, one per block element. */
export function descriptionLines(html: string | null | undefined): string[] {
  if (!html) return [];
  const $ = cheerio.load(html, null, false);
  $("br").replaceWith("\n");
  $("p, li, div, h1, h2, h3, h4, h5, h6, tr").append("\n");
  return $.root()
    .text()
    // Zero-width spaces and BOMs pasted from Word ("Job Reference: ﻿…").
    .replace(/[​﻿]/g, "")
    .split("\n")
    .map((line) => clean(line))
    .filter((line): line is string => line !== null);
}

/**
 * Values of the "Label : value" lines whose label matches one of `labels`
 * (regex sources, matched case-insensitively against the whole label).
 */
export function labelledValues(lines: string[], labels: string[]): string[] {
  const pattern = new RegExp(`^(?:${labels.join("|")})\\s*:\\s*(.+)$`, "i");
  return lines
    .map((line) => clean(line.match(pattern)?.[1]))
    .filter((value): value is string => value !== null);
}

const LOCATION_LABELS = ["lieu de travail", "lieu", "localisation", "work location", "location"];
const CONTRACT_LABELS = [
  "type de contrat",
  "type d['’]emploi",
  "contract type",
  "type of contract",
  "employment type",
];
/** Same-line employer labels ("Client : X"); "Société / Background :" introduces a paragraph instead. */
const EMPLOYER_LABELS = ["client", "employeur", "employer", "company", "entreprise"];

/** First contract value we can map; "CDI / CDD" is left unknown rather than guessed. */
function contractType(lines: string[]) {
  for (const value of labelledValues(lines, CONTRACT_LABELS)) {
    if (/\bcdi\b/i.test(value) && /\bcdd\b/i.test(value) && /\//.test(value)) return null;
    const type = normalizeContractType(value);
    if (type) return type;
  }
  return null;
}

/**
 * End employer when the description names it on a label line. Anonymous
 * descriptions ("Company: a leading mining group") and the recruiter's own
 * name ("Company: KILELE SARL" on Kilele's board) fall back to `company`.
 */
function employer(lines: string[], company: string): string {
  const own = company.split(/\s+/)[0].toLowerCase();
  const named = labelledValues(lines, EMPLOYER_LABELS).find(
    (value) =>
      value.length <= 80 &&
      !/^(a|an|the|un|une|le|la|l['’]|notre|our|leading|confidential|confidentiel)\b/i.test(value) &&
      !value.toLowerCase().startsWith(own)
  );
  return named ?? company;
}

/** Structured location, with the DRC country name fixed (see header). */
function structuredLocation(job: ManatalJob): string | null {
  const parts = [job.city, job.state, job.country]
    .map((part) => clean(part))
    .filter((part, i, all): part is string => part !== null && part !== all[i - 1]);
  if (!parts.length) return null;
  const location = parts.join(", ");
  return isInDrc(location)
    ? location.replace(/(?<!Democratic )Republic of the Congo$/, "Democratic Republic of the Congo")
    : location;
}

/**
 * Where the job is. The structured location is normally right, but some
 * recruiters set it to the office advertising the offer (Gladys Synergies
 * posts Lubumbashi jobs from "Paris, France") or to another DRC town than the
 * one in the title. The "Lieu de travail : …" line wins when it names a DRC
 * town and does not mention the structured one ("Lubumbashi ou Kolwezi" keeps
 * a structured "Kolwezi"); otherwise it is only the fallback for offers
 * without structured location.
 */
function workLocation(job: ManatalJob, lines: string[]): string | null {
  const structured = structuredLocation(job);
  const stated = labelledValues(lines, LOCATION_LABELS)[0] ?? null;
  if (!stated || !findDrcCity(stated)) return structured ?? stated;
  const structuredCity = findDrcCity(structured);
  const fold = (text: string) =>
    text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return structuredCity && fold(stated).includes(fold(structuredCity)) ? structured : stated;
}

async function listJobs(ctx: ScrapeContext, slug: string): Promise<ManatalJob[]> {
  const jobs: ManatalJob[] = [];
  let url: string | null = `${BASE}/api/v1.0/c/${slug}/jobs/?page_size=20`;
  // Bound the loop in case `next` ever points back to a seen page.
  for (let page = 0; url && page < 100; page++) {
    const data: ManatalPage = await ctx.http.json<ManatalPage>(url);
    if (!Array.isArray(data?.results)) {
      throw new Error(`Réponse inattendue de ${url} (pas de « results »)`);
    }
    jobs.push(...data.results);
    // Only follow pagination links that stay on the API host.
    url = data.next && new URL(data.next).origin === BASE ? data.next : null;
  }
  return jobs;
}

export async function manatal(
  ctx: ScrapeContext,
  {
    slug,
    company,
    isRelevant,
  }: {
    /** Career page slug, e.g. "kileledrc" in careers-page.com/kileledrc. */
    slug: string;
    /** Display name used when the description names no end employer. */
    company: string;
    /** Extra filter for boards that mix sectors (applied after the DRC filter). */
    isRelevant?: (offer: ManatalOffer) => boolean;
  }
): Promise<ScrapedJob[]> {
  const jobs = await listJobs(ctx, slug);
  ctx.log(`${jobs.length} offre(s) sur la page carrière, filtrage RDC…`);

  const hashes = new Set(jobs.map((job) => job.hash));
  const offers: ScrapedJob[] = [];
  for (const job of jobs) {
    const lines = descriptionLines(job.description);
    // An offer re-posted for another sourcing location keeps the original's
    // "Job Reference": skip the copy when the original is on the board too.
    const reference = labelledValues(lines, ["job reference"])[0];
    if (reference && reference !== job.hash && hashes.has(reference)) continue;

    const location = workLocation(job, lines);
    if (!isInDrc(location)) continue;
    if (isRelevant && !isRelevant({ title: job.position_name, lines })) continue;

    offers.push({
      externalId: job.hash,
      title: job.position_name,
      company: employer(lines, company),
      url: `${BASE}/${slug}/job/${job.hash}`,
      location,
      city: findDrcCity(location),
      contractType: contractType(lines),
      descriptionHtml: job.description,
      // Not exposed by the API (nor by the public offer page).
      publishedAt: null,
      closesAt: null,
    });
  }
  return offers;
}
