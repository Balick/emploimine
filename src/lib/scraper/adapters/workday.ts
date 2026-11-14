import { HttpError } from "../http";
import type { ScrapeContext, ScrapedJob } from "../types";
import { clean, findDrcCity, isInDrc, normalizeContractType, parseDate } from "../utils";

/**
 * Workday Recruiting external career sites, e.g.
 * `https://<tenant>.wd3.myworkdayjobs.com/<site>`.
 *
 * The career site is a JavaScript shell; it reads a public, unauthenticated
 * JSON API ("CXS") on the same host, which we call directly:
 *
 * - `POST /wday/cxs/<tenant>/<site>/jobs` with
 *   `{ appliedFacets, limit, offset, searchText }`: the search results
 *   (title, `externalPath`, short location text). No description.
 * - `GET /wday/cxs/<tenant>/<site><externalPath>`: one offer
 *   (`jobPostingInfo`) with its HTML description, posting date, country and
 *   requisition id. Fetched for the DRC search results only.
 *
 * Quirks seen on the API (2026-11):
 * - the country facet is how we ask for DRC offers only, but its *name*
 *   differs per tenant ("Country", "locationCountry"…: it is the
 *   `facetParameter` listed in the `facets` of an unfiltered search). The id
 *   of the DRC value is the same everywhere (Workday reference data). An
 *   unknown facet name is answered with HTTP 400, so a renamed facet fails
 *   loudly instead of silently returning the whole board;
 * - `limit` above 20 is answered with HTTP 400;
 * - `total` is only filled on the first page (it is 0 on the next ones);
 * - `locationsText` is sometimes the city alone ("Kolwezi"), sometimes
 *   "City, Country", and "2 Locations" for multi-site offers, so the DRC
 *   check is made on the detail, which carries the country.
 */

/** Workday reference id of "Congo, Democratic Republic of the". */
export const WORKDAY_DRC_COUNTRY_ID = "db69c26c446c11de98360015c5e6daf6";

/** Largest page size the CXS API accepts. */
const PAGE_SIZE = 20;
/** Guard against an endless loop if the API misbehaves (20 × 50 = 1 000 offers). */
const MAX_PAGES = 50;

type WorkdayPosting = {
  title: string;
  /** e.g. "/job/Lubumbashi-Congo-Democratic-Republic-of-the/Logistics-Operations-Support_R-017679". */
  externalPath: string;
  locationsText?: string;
  postedOn?: string;
  bulletFields?: string[];
};

type WorkdaySearchResponse = {
  /** Number of matching offers; only reliable on the first page. */
  total?: number;
  jobPostings?: WorkdayPosting[];
};

type WorkdayCountry = { descriptor?: string; id?: string; alpha2Code?: string };

type WorkdayPostingInfo = {
  /** Workday id of the posting (32 hex chars). */
  id: string;
  title: string;
  /** HTML. */
  jobDescription?: string;
  /** Primary location, e.g. "Lubumbashi, Congo, Democratic Republic of the" or "Kolwezi". */
  location?: string;
  additionalLocations?: string[];
  /** Posting start date, `YYYY-MM-DD`. */
  startDate?: string;
  /** Posting end date, `YYYY-MM-DD`, when the recruiter set one. */
  endDate?: string;
  /** "Full time" / "Part time": not a contract type, but some tenants put "Temporary" here. */
  timeType?: string;
  /** Requisition number, e.g. "R-017679". */
  jobReqId?: string;
  country?: WorkdayCountry;
  jobRequisitionLocation?: { descriptor?: string; country?: WorkdayCountry };
  externalUrl?: string;
  /** False once the offer has been unposted (it may still be reachable by its path). */
  posted?: boolean;
};

type WorkdayDetailResponse = { jobPostingInfo?: WorkdayPostingInfo };

export type WorkdayOptions = {
  /** Tenant, first label of the host and part of the API path (e.g. "trafigura"). */
  tenant: string;
  /** Data center label of the host (e.g. "wd3"). */
  instance: string;
  /** Career site id, as in the public URL (e.g. "TrafiguraCareerSite"). */
  site: string;
  /** Name of the country facet on this site (e.g. "Country", "locationCountry"). */
  countryFacet: string;
  /** Display name of the hiring company. */
  company: string;
};

/** True when the detail of an offer places it in the DRC (primary or additional location). */
function isDrcPosting(info: WorkdayPostingInfo): boolean {
  const country = info.country ?? info.jobRequisitionLocation?.country;
  if (country?.id === WORKDAY_DRC_COUNTRY_ID || country?.alpha2Code === "CD") return true;
  // When the primary country is known and is not the DRC, its location text is
  // not evidence (a DRC place name such as Moanda also exists in Gabon): only
  // an additional DRC site counts.
  const primary = country?.id || country?.alpha2Code ? [] : [info.location, country?.descriptor];
  return [...primary, ...(info.additionalLocations ?? [])].some((value) => isInDrc(value));
}

/**
 * Human readable DRC location of an offer. The country is appended only when
 * the location text does not already point to the DRC (e.g. a site name):
 * Workday translates `country.descriptor` after our `Accept-Language`
 * ("Congo, République démocratique du") but not `location`, so a plain
 * "contains" check would repeat the country in two languages.
 */
function drcLocation(info: WorkdayPostingInfo): string | null {
  const country = clean((info.country ?? info.jobRequisitionLocation?.country)?.descriptor);
  const primary = clean(info.location);
  if (primary && isInDrc(primary)) return primary;
  if (primary && isDrcPosting({ ...info, additionalLocations: [] })) {
    return country ? `${primary}, ${country}` : primary;
  }
  // Multi-site offer whose primary location is abroad: keep the DRC one.
  return clean(info.additionalLocations?.find((value) => isInDrc(value))) ?? country;
}

export async function workday(
  ctx: ScrapeContext,
  { tenant, instance, site, countryFacet, company }: WorkdayOptions
): Promise<ScrapedJob[]> {
  const origin = `https://${tenant}.${instance}.myworkdayjobs.com`;
  const api = `${origin}/wday/cxs/${tenant}/${site}`;

  const postings: WorkdayPosting[] = [];
  let total = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    const response = await ctx.http.json<WorkdaySearchResponse>(`${api}/jobs`, {
      method: "POST",
      json: {
        appliedFacets: { [countryFacet]: [WORKDAY_DRC_COUNTRY_ID] },
        limit: PAGE_SIZE,
        offset,
        searchText: "",
      },
    });
    if (!Array.isArray(response.jobPostings)) {
      throw new Error(`Workday: unexpected search response for ${site} (jobPostings missing)`);
    }
    if (page === 0) total = response.total ?? 0;
    postings.push(...response.jobPostings);
    if (response.jobPostings.length < PAGE_SIZE || postings.length >= total) break;
  }
  ctx.log(`${postings.length} offre(s) avec le filtre pays RDC, lecture des détails…`);

  const details = await Promise.all(
    postings.map(async (posting) => {
      let response: WorkdayDetailResponse;
      try {
        response = await ctx.http.json<WorkdayDetailResponse>(`${api}${posting.externalPath}`);
      } catch (error) {
        // Unposted between the search and this call: it is no longer listed.
        if (error instanceof HttpError && error.status === 404) {
          ctx.log(`offre ${posting.externalPath} introuvable (retirée ?), ignorée`);
          return null;
        }
        throw error;
      }
      const info = response.jobPostingInfo;
      if (!info?.title) {
        throw new Error(`Workday: unexpected detail response for ${posting.externalPath}`);
      }
      return { posting, info };
    })
  );

  return details
    .filter((detail) => detail !== null)
    .filter(({ info }) => info.posted !== false && isDrcPosting(info))
    .map(({ posting, info }) => {
      const location = drcLocation(info);
      return {
        // The requisition number is what recruiters and candidates quote;
        // the Workday posting id is a fallback.
        externalId: info.jobReqId ?? info.id,
        title: info.title,
        company,
        url: info.externalUrl ?? `${origin}/${site}${posting.externalPath}`,
        location,
        city: findDrcCity(location) ?? findDrcCity(info.jobRequisitionLocation?.descriptor),
        contractType: normalizeContractType(info.timeType),
        descriptionHtml: info.jobDescription ?? null,
        publishedAt: parseDate(info.startDate),
        closesAt: parseDate(info.endDate),
      };
    });
}
