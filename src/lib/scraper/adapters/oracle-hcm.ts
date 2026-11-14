import type { ScrapeContext, ScrapedJob } from "../types";
import { clean, findDrcCity, isInDrc, normalizeContractType, parseDate } from "../utils";

/**
 * Oracle Fusion HCM "Candidate Experience" (CE) career sites, e.g.
 * `https://<pod>.fa.<dc>.oraclecloud.com/hcmUI/CandidateExperience/en/sites/<siteNumber>`.
 *
 * The CE page is a JavaScript shell; it reads two public, unauthenticated
 * REST resources of the same host, which we call directly:
 *
 * - `recruitingCEJobRequisitions` with the `findReqs` finder: the search
 *   results (title, primary location, posting date), paginated with
 *   `limit`/`offset` and filterable by a geography id (`locationId`, the
 *   "Location" facet of the UI). No description.
 * - `recruitingCEJobRequisitionDetails` with the `ById` finder: one offer with
 *   its HTML description and posting dates. Fetched for DRC offers only.
 *
 * Finder parameters are not regular query parameters: they are packed in
 * `finder=<name>;key=value,key=value`, so values must not contain `,` or `;`.
 *
 * Quirks seen on the API (2026-11):
 * - an unknown `locationId` is silently ignored and the whole board comes
 *   back, so the DRC filter is always re-applied on our side;
 * - `TotalJobsCount` can be one more than the rows actually served, so paging
 *   also stops on a short page;
 * - `limit=200` serves 199 rows; 100 is served in full;
 * - with a non-English `Accept-Language` (our client sends French first),
 *   `locationId` is ignored and location names are partly translated
 *   ("République démocratique du Congo-Kinshasa"), so requests are sent in
 *   the site language.
 */

type OracleLocation = {
  Name?: string | null;
  CountryCode?: string | null;
};

type OracleRequisition = {
  /** Requisition number, e.g. "240630"; also the id of the public page. */
  Id: string;
  Title: string;
  /** Posting date, `YYYY-MM-DD`. */
  PostedDate?: string | null;
  PostingEndDate?: string | null;
  /** e.g. "Durba, Haut Uele, DR Congo-Kinshasa". */
  PrimaryLocation?: string | null;
  /** ISO 3166 alpha-2, e.g. "CD". */
  PrimaryLocationCountry?: string | null;
  secondaryLocations?: OracleLocation[] | null;
};

type OracleSearchResponse = {
  items?: {
    TotalJobsCount?: number;
    requisitionList?: OracleRequisition[];
  }[];
};

type OracleRequisitionDetail = {
  Id: string;
  Title: string;
  ExternalPostedStartDate?: string | null;
  ExternalPostedEndDate?: string | null;
  /** Main description (HTML, usually pasted from Word). */
  ExternalDescriptionStr?: string | null;
  /** Optional extra sections, often empty strings. */
  ExternalResponsibilitiesStr?: string | null;
  ExternalQualificationsStr?: string | null;
  ContractType?: string | null;
  JobType?: string | null;
  WorkerType?: string | null;
  JobLevel?: string | null;
  NumberOfOpenings?: number | null;
};

type OracleDetailResponse = {
  items?: OracleRequisitionDetail[];
};

type OracleHcmOptions = {
  /** API host, e.g. "ehkn.fa.ca2.oraclecloud.com". */
  host: string;
  /** CE site, e.g. "CX_1". */
  siteNumber: string;
  /** Default display name of the employer. */
  company: string;
  /**
   * Geography id of the UI "Location" facet (e.g. the DRC country node) to
   * filter on the server. Optional: without it the whole board is paged and
   * filtered locally.
   */
  locationId?: number;
  /** Site language: `Accept-Language` of API calls and segment of the offer URL. Default "en". */
  language?: string;
  /** Rows per search request. Default 100 (see quirks above). */
  pageSize?: number;
  /**
   * Optional refinement of `company` (e.g. the mine a group offer belongs to,
   * from its location). Return `null` to keep the default.
   */
  resolveCompany?: (job: { title: string; location: string }) => string | null;
};

/** Safety net against a looping paginator (100 pages × 100 rows). */
const MAX_PAGES = 100;

/** Location text of a requisition if it is (also) located in the DRC. */
function drcLocation(req: OracleRequisition): string | null {
  const locations: OracleLocation[] = [
    { Name: req.PrimaryLocation, CountryCode: req.PrimaryLocationCountry },
    ...(req.secondaryLocations ?? []),
  ];
  const drc = locations.find(
    (location) => isInDrc(location.CountryCode) || isInDrc(location.Name)
  );
  // Fall back to the country name when the location has no label.
  return drc ? (clean(drc.Name) ?? "RDC") : null;
}

async function searchAll(
  ctx: ScrapeContext,
  base: string,
  { siteNumber, locationId, pageSize = 100 }: OracleHcmOptions,
  headers: Record<string, string>
): Promise<OracleRequisition[]> {
  const all: OracleRequisition[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * pageSize;
    const finder = [
      `findReqs;siteNumber=${siteNumber}`,
      `limit=${pageSize}`,
      `offset=${offset}`,
      ...(locationId ? [`locationId=${locationId}`] : []),
      "sortBy=POSTING_DATES_DESC",
    ].join(",");
    const response = await ctx.http.json<OracleSearchResponse>(
      `${base}/hcmRestApi/resources/latest/recruitingCEJobRequisitions` +
        `?onlyData=true&expand=requisitionList.secondaryLocations&finder=${finder}`,
      { headers }
    );

    const result = response.items?.[0];
    if (!result || !Array.isArray(result.requisitionList)) {
      throw new Error("Oracle HCM: unexpected search response (items[0].requisitionList missing)");
    }

    all.push(...result.requisitionList);
    const total = result.TotalJobsCount ?? 0;
    if (result.requisitionList.length < pageSize || offset + pageSize >= total) break;
  }

  return all;
}

/**
 * City of an Oracle location ("Durba, Haut Uele, DR Congo-Kinshasa"). Oracle's
 * country label "DR Congo-Kinshasa" (also alone, for country-level postings)
 * is neutralised first: it would otherwise be read as the city of Kinshasa.
 */
function cityOf(location: string): string | null {
  return findDrcCity(location.replace(/congo[- ]kinshasa/gi, "Congo"));
}

/** Description sections, in the order the CE page shows them. */
function descriptionHtml(detail: OracleRequisitionDetail): string | null {
  const parts = [
    detail.ExternalDescriptionStr,
    detail.ExternalResponsibilitiesStr,
    detail.ExternalQualificationsStr,
  ].filter((part): part is string => Boolean(part?.trim()));
  return parts.length ? parts.join("\n") : null;
}

export async function oracleHcm(
  ctx: ScrapeContext,
  options: OracleHcmOptions
): Promise<ScrapedJob[]> {
  const { host, siteNumber, company, language = "en", resolveCompany } = options;
  const base = `https://${host}`;
  const headers = { "accept-language": language };

  const requisitions = await searchAll(ctx, base, options, headers);
  ctx.log(`${requisitions.length} offre(s) trouvée(s), filtrage RDC…`);

  const drc = requisitions.flatMap((req) => {
    const location = drcLocation(req);
    return location ? [{ req, location }] : [];
  });

  const jobs = await Promise.all(
    drc.map(async ({ req, location }): Promise<ScrapedJob | null> => {
      const response = await ctx.http.json<OracleDetailResponse>(
        `${base}/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails` +
          `?expand=all&onlyData=true&finder=ById;Id=%22${encodeURIComponent(req.Id)}%22,siteNumber=${siteNumber}`,
        { headers }
      );
      if (!Array.isArray(response.items)) {
        throw new Error(`Oracle HCM: unexpected detail response for requisition ${req.Id}`);
      }
      const detail = response.items[0];
      // Unposted between the search and this call: it is no longer listed.
      if (!detail) {
        ctx.log(`offre ${req.Id} introuvable (retirée ?), ignorée`);
        return null;
      }

      const openings = detail.NumberOfOpenings;
      return {
        externalId: req.Id,
        title: clean(detail.Title) ?? req.Title,
        company: resolveCompany?.({ title: req.Title, location }) ?? company,
        url: `${base}/hcmUI/CandidateExperience/${language}/sites/${siteNumber}/job/${req.Id}`,
        location,
        city: cityOf(location),
        contractType: normalizeContractType(
          detail.ContractType ?? detail.JobType ?? detail.WorkerType
        ),
        descriptionHtml: descriptionHtml(detail),
        publishedAt: parseDate(detail.ExternalPostedStartDate ?? req.PostedDate),
        closesAt: parseDate(detail.ExternalPostedEndDate ?? req.PostingEndDate),
        vacancies: openings && Number.isInteger(openings) && openings > 0 ? openings : null,
        level: clean(detail.JobLevel),
      };
    })
  );

  return jobs.filter((job): job is ScrapedJob => job !== null);
}
