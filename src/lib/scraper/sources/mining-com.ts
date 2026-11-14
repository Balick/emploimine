/**
 * MINING.COM Jobs: international mining job board (run on the JBoard.io
 * platform), with a country page for the DRC.
 *
 * Endpoint: the DRC country page
 *   https://www.mining.com/jobs/in-democratic-republic-of-the-congo
 * embeds every listed offer as JSON (`window.jobsList = window.jobsList.concat([...])`,
 * one line per widget) with the description, employer, location and apply
 * link, so no HTML scraping of the cards is needed. Pages follow
 * `<link rel="next">` (50 offers per page; the DRC page fits on one today).
 * The closing date is only exposed by the JSON-LD `JobPosting` of each offer
 * page (`validThrough`; the listing's `job_expires_in_days` does not match it),
 * so the offer pages of the kept offers are fetched too and their JSON-LD
 * fields take precedence.
 *
 * De-duplication: the board mostly relays offers that our direct sources
 * already scrape at the employer's own ATS (e.g. Ivanhoe Mines/Kamoa Copper
 * via simplify.hr). Those are skipped, by employer name or by apply link /
 * employer website. Apply links are matched against the *tenants* of our
 * sources, not whole ATS hosts: other employers (First Quantum on Workday…)
 * use the same platforms and must be kept.
 *
 * robots.txt (www.mining.com): `User-agent: *` with an empty `Disallow`,
 * everything allowed. Works with the bot User-Agent.
 * Verified 2026-11-14: 7 DRC offers listed, all from Ivanhoe Mines (Kamoa
 * Copper) and therefore skipped as duplicates, so 0 offers returned.
 */
import * as cheerio from "cheerio";
import { defineSource, type ScrapedJob } from "../types";
import { absoluteUrl, clean, findDrcCity, isInDrc, normalizeContractType, parseDate } from "../utils";

const LISTING_URL = "https://www.mining.com/jobs/in-democratic-republic-of-the-congo";
/** Safety net against a pagination loop. */
const MAX_PAGES = 20;

/** Offer as serialised in `window.jobsList` (only the fields we read). */
type BoardJob = {
  id: number;
  title: string;
  /** HTML. */
  description: string | null;
  status?: string;
  /** Free text typed by the employer, e.g. "Solwezi Office, Zambia". */
  location: string | null;
  apply_to: string | null;
  posted_at: string | null;
  /** Relative path of the offer page, e.g. "/jobs/796673262-legal-assistant". */
  job_details_path: string;
  employer: { name: string; website: string | null } | null;
  /** Geocoded location, e.g. "Solwezi, Northwestern, Zambia"; may be null. */
  job_location: { name: string } | null;
  job_type: { title: string; google_employment_type?: string | null } | null;
};

/** schema.org JobPosting as embedded in the offer page (only the fields we read). */
type JobPosting = {
  "@type"?: string;
  title?: string;
  description?: string;
  datePosted?: string;
  validThrough?: string;
  /** Google values: FULL_TIME, CONTRACTOR, TEMPORARY, INTERN… */
  employmentType?: string | string[];
  hiringOrganization?: { name?: string } | null;
  jobLocation?: {
    address?: { addressLocality?: string; addressRegion?: string; addressCountry?: string };
  } | null;
};

/**
 * Employers that have their own source (see sources/). "Komatsu" is
 * deliberately absent: our BIA source only covers the dealer's own board, not
 * Komatsu Mining's DRC offers (BIA-posted ones are still caught by URL below).
 */
const COVERED_EMPLOYERS =
  /\b(ivanhoe|kamoa|kipushi|kobold|barrick|kibali|glencore|kamoto|kcc|mutanda|sandvik|epiroc|bia|sgs|trafigura|hatch|metso|orica|weir|agl|africa global logistics|catering international|gladys synergies|kilele)\b/i;

/**
 * Career sites scraped by our direct sources, matched against the apply link
 * and the employer website. Multi-tenant ATS are matched on the tenant only.
 */
const COVERED_URLS: RegExp[] = [
  // simplify.hr is used, in the DRC, by the Ivanhoe group only (Ivanhoe,
  // Kamoa Copper, Kipushi): the whole host is skipped.
  /(^|\.)simplify\.hr\//i,
  /greenhouse\.io\/(embed\/job_app\?for=)?koboldmetals/i,
  /\/\/(trafigura|weir|sandvik)\.wd\d+\.myworkdayjobs\.com\//i,
  // Barrick's Oracle HCM tenant.
  /\/\/ehkn\.fa\.ca2\.oraclecloud\.com\//i,
  /glencore/i,
  /smartrecruiters\.com\/sgs\b/i,
  /careers-page\.com\/(gladys-synergies|kileledrc)\b/i,
  /\/\/(acareerbyagl|cis-career)\.talent-soft\.com\//i,
  /\/\/career\.cis-integratedservices\.com\//i,
  /\/\/(jobs\.barrick\.com|jobs\.biagroup\.com|jobs\.hatch\.com|careers\.metso\.com|careers\.orica\.com|www\.careerprofile\.epiroc\.com)\//i,
];

function isCovered(job: BoardJob): boolean {
  if (job.employer && COVERED_EMPLOYERS.test(job.employer.name)) return true;
  const urls = [job.apply_to, job.employer?.website].filter((url): url is string => !!url);
  return urls.some((url) => COVERED_URLS.some((pattern) => pattern.test(url)));
}

/**
 * Read the offers of a listing page. Each widget appends its offers with a
 * single-line `window.jobsList = window.jobsList.concat([...]);` statement;
 * an empty page still has the statement with `[]`.
 */
function parseJobsList(html: string, url: string): BoardJob[] {
  const lines = [...html.matchAll(/^\s*window\.jobsList\s*=\s*window\.jobsList\.concat\((.*)\);\s*$/gm)];
  if (lines.length === 0) throw new Error(`window.jobsList introuvable sur ${url}`);
  return lines.flatMap((match) => JSON.parse(match[1]) as BoardJob[]);
}

/** The JobPosting JSON-LD of an offer page. */
function parseJobPosting(html: string, url: string): JobPosting {
  const $ = cheerio.load(html);
  for (const script of $('script[type="application/ld+json"]').toArray()) {
    const data = JSON.parse($(script).text()) as JobPosting;
    if (data["@type"] === "JobPosting") return data;
  }
  throw new Error(`JSON-LD JobPosting introuvable sur ${url}`);
}

export default defineSource({
  id: "mining-com",
  name: "MINING.COM Jobs",
  website: LISTING_URL,
  kind: "job_board",
  async scrape(ctx) {
    const listed = new Map<number, BoardJob>();
    let pageUrl: string | undefined = LISTING_URL;
    for (let page = 0; pageUrl && page < MAX_PAGES; page++) {
      const html = await ctx.http.text(pageUrl);
      for (const job of parseJobsList(html, pageUrl)) listed.set(job.id, job);
      const next = cheerio.load(html)('link[rel="next"]').attr("href");
      pageUrl = next ? absoluteUrl(next, pageUrl) : undefined;
    }

    const inDrc = [...listed.values()].filter(
      (job) => (job.status ?? "active") === "active" && isInDrc(job.location, job.job_location?.name)
    );
    const kept = inDrc.filter((job) => !isCovered(job));
    ctx.log(
      `${listed.size} offre(s) listée(s), ${inDrc.length} en RDC, ` +
        `${inDrc.length - kept.length} ignorée(s) (déjà couvertes par une source directe)`
    );

    return Promise.all(
      kept.map(async (job): Promise<ScrapedJob> => {
        const url = absoluteUrl(job.job_details_path, LISTING_URL);
        const posting = parseJobPosting(await ctx.http.text(url), url);

        const address = posting.jobLocation?.address;
        const location =
          clean(
            [address?.addressLocality, address?.addressRegion, address?.addressCountry]
              .filter(Boolean)
              .join(", ")
          ) ??
          clean(job.job_location?.name) ??
          clean(job.location);
        const employmentType = [posting.employmentType ?? []].flat().join(" ");

        return {
          externalId: String(job.id),
          // Titles often carry stray (non-breaking) spaces.
          title: clean(posting.title) ?? clean(job.title) ?? "",
          company: clean(posting.hiringOrganization?.name) ?? clean(job.employer?.name) ?? "",
          url,
          location,
          city: findDrcCity(location) ?? findDrcCity(job.location),
          contractType:
            normalizeContractType(job.job_type?.title) ?? normalizeContractType(employmentType),
          descriptionHtml: posting.description ?? job.description,
          publishedAt: parseDate(posting.datePosted ?? job.posted_at),
          closesAt: parseDate(posting.validThrough),
        };
      })
    );
  },
});
