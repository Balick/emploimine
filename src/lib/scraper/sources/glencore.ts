/**
 * Glencore: global careers listing. In the DRC it covers Kamoto Copper
 * Company (KCC, Kolwezi) and Mutanda Mining, whose offers are published on
 * Glencore's SuccessFactors career site (careers.glencorecopper.com).
 *
 * Endpoint: the JSON API behind https://www.glencore.com/en/careers/jobs
 *   GET https://www.glencore.com/.rest/api/v2/careers/?locale=fr|en&offset=…&limit=…
 * It returns every Glencore offer worldwide (~320 in English, ~80 in French)
 * with the full HTML description; each locale is a separate set of postings.
 * The contract type is only on the SuccessFactors offer page, which is
 * fetched for the DRC offers only.
 * This single source replaces the old Puppeteer scrapers for Glencore and KCC
 * (the old /careers/career-opportunities/africa page is gone: 404).
 *
 * robots.txt: www.glencore.com only disallows a list of PDF documents under
 * /.rest/api/v1/documents/; careers.glencorecopper.com allows /job/.
 * Verified 2026-11-14 (319 offers in English, 80 in French, 6 DRC offers, all KCC).
 */
import * as cheerio from "cheerio";
import { HttpError } from "../http";
import { defineSource, type ScrapeContext, type ScrapedJob } from "../types";
import { findDrcCity, isInDrc, normalizeContractType, parseDate } from "../utils";

type GlencoreJob = {
  /** Id of this locale's copy of the posting. */
  id: number;
  /** Requisition id in the ATS, shared by the French and English copies. */
  jobId: string;
  /** Upstream ATS feed, e.g. "SF FEED" (SuccessFactors), "Lever", "Global". */
  feed: string;
  language?: string;
  locationTitle?: string;
  /** Empty values are a zero-width space (U+200B), not "". */
  city?: string;
  region?: string;
  country?: string;
  title: string;
  highlights?: string[];
  /** Business unit, e.g. "KCC", "Copper", "Coal". */
  commodity?: string;
  department?: string;
  description?: string;
  url: string;
  applicationLink?: string;
  startDate?: string;
  endDate?: string;
};

type GlencoreResponse = {
  /** Only filled on the first page: later pages report 0. */
  totalResults: number;
  data: GlencoreJob[];
};

const API_URL = "https://www.glencore.com/.rest/api/v2/careers/";
const PAGE_SIZE = 400;
/** French first: when an offer is published in both languages, keep the French copy. */
const LOCALES = ["fr", "en"] as const;

/** Trim and drop the zero-width spaces the API uses for empty fields. */
function field(value: string | null | undefined): string | null {
  const text = value?.replace(/[\u200b\s]+/g, " ").trim();
  return text ? text : null;
}

async function fetchLocale(ctx: ScrapeContext, locale: string): Promise<GlencoreJob[]> {
  const jobs: GlencoreJob[] = [];
  let total = Infinity;
  for (let offset = 0; offset < total; offset += PAGE_SIZE) {
    const params = new URLSearchParams({
      locale,
      sortBy: "",
      offset: String(offset),
      limit: String(PAGE_SIZE),
      searchCriteria: "{}",
      keyword: "",
    });
    const page = await ctx.http.json<GlencoreResponse>(`${API_URL}?${params}`);
    if (!Array.isArray(page?.data)) {
      throw new Error(`Unexpected Glencore careers response (locale=${locale}, offset=${offset})`);
    }
    if (offset === 0) total = page.totalResults;
    jobs.push(...page.data);
    if (page.data.length < PAGE_SIZE) break;
  }
  return jobs;
}

/**
 * Dates are local midnights in Zurich serialised in UTC
 * ("2026-10-28T23:00:00Z" is the offer posted on Oct 29, as the offer page
 * shows), so the calendar date must be read in that time zone.
 */
const TIME_ZONE = "Europe/Zurich";

/**
 * `endDate` is the Zurich midnight at which the posting is unpublished, so the
 * last day to apply is the day before ("2026-12-11T23:00Z" matches the
 * "Application Deadline: 11 December 2026" written in the description).
 * Some feeds (e.g. "Global") set it a couple of hours after `startDate`,
 * which is not a real deadline.
 */
function closingDate(job: GlencoreJob): string | null {
  const start = Date.parse(job.startDate ?? "");
  const end = Date.parse(job.endDate ?? "");
  if (Number.isNaN(end) || (!Number.isNaN(start) && end - start < 24 * 3_600_000)) return null;
  return parseDate(new Date(end - 60_000), { timeZone: TIME_ZONE });
}

function companyName(job: GlencoreJob): string {
  const unit = `${job.commodity ?? ""} ${job.department ?? ""}`;
  if (/\bKCC\b|kamoto/i.test(unit)) return "Kamoto Copper Company";
  if (/mutanda|\bMUMI\b/i.test(unit)) return "Mutanda Mining";
  return "Glencore";
}

/** Public offer page over HTTPS, without the tracking parameter. */
function offerUrl(job: GlencoreJob): string {
  const url = new URL(job.url || job.applicationLink || "");
  if (url.protocol === "http:") url.protocol = "https:";
  url.searchParams.delete("utm_source");
  return url.toString();
}

/**
 * KCC descriptions sometimes start with labelled lines ("Number of Positions:
 * 01 (One)", "Niveau du poste : Cadre de Direction", "Type de contrat : …").
 */
function labelledValues(html: string | undefined) {
  const values: { vacancies?: number; level?: string; contract?: string } = {};
  if (!html) return values;
  const $ = cheerio.load(html, null, false);
  $("p, li").each((_, element) => {
    const line = field($(element).text());
    const match = line?.match(/^([^:]{3,40}?)\s*:\s*(.+)$/);
    if (!match) return;
    const [, label, value] = match;
    if (/^(number of positions?|nombre de postes?(\(s\))?)$/i.test(label)) {
      const count = Number(value.match(/^\d+/)?.[0]);
      if (count > 0) values.vacancies = count;
    } else if (/^(position level|niveau du poste)$/i.test(label)) {
      values.level = value;
    } else if (/^(contract type|type de contrat)$/i.test(label)) {
      values.contract = value;
    }
  });
  return values;
}

/** "Job Type" of the SuccessFactors offer page ("Fixed Term", "Permanent"…). */
async function fetchJobType(ctx: ScrapeContext, url: string): Promise<string | null> {
  try {
    const $ = cheerio.load(await ctx.http.text(url));
    return field($('[data-careersite-propertyid="shifttype"]').first().text());
  } catch (error) {
    // The listing can lag behind the ATS: an offer page that was just removed
    // only costs us the contract type.
    if (error instanceof HttpError && (error.status === 404 || error.status === 410)) {
      ctx.log(`Page introuvable (${error.status}) : ${url}`);
      return null;
    }
    throw error;
  }
}

export default defineSource({
  id: "glencore",
  name: "Glencore",
  website: "https://www.glencore.com/en/careers/jobs",
  kind: "employer",
  async scrape(ctx) {
    // The same requisition can be published once per language: keep one copy.
    const offers = new Map<string, GlencoreJob>();
    for (const locale of LOCALES) {
      const jobs = await fetchLocale(ctx, locale);
      ctx.log(`${jobs.length} offre(s) (locale=${locale}), filtrage RDC…`);
      for (const job of jobs) {
        const country = field(job.country);
        const inDrc = country
          ? isInDrc(country)
          : isInDrc(field(job.locationTitle), field(job.city), ...(job.highlights ?? []));
        const key = `${job.feed}:${job.jobId}`;
        if (inDrc && !offers.has(key)) offers.set(key, job);
      }
    }

    return Promise.all(
      [...offers.values()].map(async (job): Promise<ScrapedJob> => {
        const url = offerUrl(job);
        const labelled = labelledValues(job.description);
        const jobType = await fetchJobType(ctx, url);
        const location = [field(job.city), field(job.region), field(job.country) ?? field(job.locationTitle)]
          .filter(Boolean)
          .join(", ");
        return {
          externalId: `${job.feed}:${job.jobId}`,
          title: job.title,
          company: companyName(job),
          url,
          location: location || null,
          city: findDrcCity(location),
          contractType: normalizeContractType(jobType) ?? normalizeContractType(labelled.contract),
          descriptionHtml: job.description ?? null,
          publishedAt: parseDate(job.startDate, { timeZone: TIME_ZONE }),
          closesAt: closingDate(job),
          vacancies: labelled.vacancies ?? null,
          level: labelled.level ?? null,
        };
      })
    );
  },
});
