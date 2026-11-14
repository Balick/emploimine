import * as cheerio from "cheerio";
import type { ScrapeContext, ScrapedJob } from "../types";
import { absoluteUrl, clean, findDrcCity, isInDrc, normalizeContractType, parseDate } from "../utils";

/**
 * SAP SuccessFactors Recruiting Marketing ("RMK", a.k.a. Career Site Builder),
 * the server-rendered career sites served on a company domain, e.g.
 * `https://careers.orica.com/search/?q=&optionsFacetsDD_country=CD`.
 *
 * The search page comes in two layouts, depending on the site's theme:
 * - a table: `table#searchresults tr.data-row` with `a.jobTitle-link`,
 *   `span.jobLocation`, `span.jobDate`, and a "Results 1 – 25 of 152" label;
 * - tiles: `ul#job-tile-list li.job-tile`, with labelled fields
 *   (`.section-field.<name>`) and the total in an inline script
 *   (`jobRecordsFound: parseInt("7")`).
 * Both are paged with `startrow=N`.
 *
 * Quirk: when a search has no match, the page shows a `#noresults` box
 * ("There are currently no open positions matching…") followed by the 10 most
 * recent jobs of the whole site. Those fallback jobs are unrelated, so the box
 * means "no offer".
 *
 * The description, dates and the full location list are only on the public
 * detail page (`/job/<slug>/<id>/`), which also carries schema.org microdata
 * (`datePosted`, `validThrough`). Details are fetched for
 * DRC offers only.
 *
 * robots.txt (identical on every RMK site, checked 2026-11-14) disallows
 * `/services/` (RSS feeds), `/talentcommunity/`, `/applybutton/`, `/preapply/`
 * and a few others; `/search/` and `/job/` are allowed and are all we request.
 */

type SuccessFactorsOptions = {
  /** Career site origin, e.g. "https://careers.orica.com". */
  origin: string;
  /**
   * Searches restricting the results to the DRC, e.g.
   * `{ optionsFacetsDD_country: "CD" }` (country facet, ISO code) or
   * `{ locationsearch: "Kolwezi" }` (free-text location search, which also
   * matches the secondary locations of multi-location offers). Their results
   * are merged and de-duplicated.
   */
  searches: Record<string, string>[];
  /** Display name of the employer. */
  company: string;
};

type ListItem = {
  externalId: string;
  title: string;
  url: string;
  location: string | null;
  /** The row says "+N more…": other locations are only on the detail page. */
  moreLocations: boolean;
  date: string | null;
  contractType: string | null;
};

type ListPage = {
  items: ListItem[];
  /** `startrow` of the next page, or `null` on the last page. */
  nextStartRow: number | null;
};

/** Safety net against a pagination loop if the site misbehaves. */
const MAX_PAGES = 40;

const CONTRACT_LABEL = /contract|contrat|employment type|type d'emploi/i;

/**
 * True when a SuccessFactors location points to the DRC. Locations look like
 * "Kolwezi, Lualaba, CD" or "Lubumbashi, HK, CD, 00000": the country is an
 * ISO code that `isInDrc` only accepts on its own, hence the per-part check.
 */
function isDrcLocation(location: string | null | undefined): boolean {
  if (!location) return false;
  if (isInDrc(location)) return true;
  return location
    .split(",")
    .slice(1)
    .some((part) => part.trim() === "CD");
}

function jobIdFromHref(href: string): string {
  // Detail links end with the numeric requisition posting id:
  // `/job/Kolwezi-Business-Line-Manager-Lual/1384619633/`.
  const id = href.match(/\/(\d+)\/?(?:[?#].*)?$/)?.[1];
  if (!id) throw new Error(`SuccessFactors: unexpected job link "${href}"`);
  return id;
}

function parseTable($: cheerio.CheerioAPI, base: string, startRow: number): ListPage {
  const items = $("table#searchresults tr.data-row")
    .toArray()
    .map((row): ListItem => {
      const $row = $(row);
      const link = $row.find("a.jobTitle-link").first();
      const href = link.attr("href") ?? "";

      // The location cell may end with `<small>+3 more…</small>`.
      const locationCell = $row.find("td.colLocation .jobLocation").first().clone();
      const moreLocations = locationCell.find("small").remove().length > 0;

      return {
        externalId: jobIdFromHref(href),
        title: clean(link.text()) ?? "",
        url: absoluteUrl(href, base),
        location: clean(locationCell.text()),
        moreLocations,
        date: clean($row.find("td.colDate .jobDate").first().text()),
        contractType: null,
      };
    });

  // "Results 1 – 25 of 152": the upper bound is the next page's startrow.
  const bounds = $(".paginationLabel b")
    .toArray()
    .map((b) => $(b).text());
  const last = Number(bounds[0]?.match(/(\d+)\s*$/)?.[1] ?? NaN);
  const total = Number(bounds[1]?.replace(/\D/g, "") ?? NaN);
  if (items.length > 0 && (!Number.isFinite(last) || !Number.isFinite(total))) {
    throw new Error("SuccessFactors: pagination label not found");
  }
  return { items, nextStartRow: last < total && last > startRow ? last : null };
}

function parseTiles(
  $: cheerio.CheerioAPI,
  html: string,
  base: string,
  startRow: number
): ListPage {
  const items = $("ul#job-tile-list li.job-tile")
    .toArray()
    .map((tile): ListItem => {
      const $tile = $(tile);
      const link = $tile.find("a.jobTitle-link").first();
      const href = link.attr("href") ?? $tile.attr("data-url") ?? "";

      // Each tile repeats its fields for desktop, tablet and mobile; read the
      // desktop copy. Fields are `<div class="section-field <name>">` with a
      // `.section-label` and a `[id$=-value]` child.
      const fields = $tile
        .find(".sub-section-desktop .section-field")
        .toArray()
        .map((field) => ({
          name: $(field).attr("class") ?? "",
          label: clean($(field).find(".section-label").text()) ?? "",
          value: clean($(field).children("[id$='-value']").text()),
        }));
      const location = fields
        .filter((f) => /\b(city|location|state|country)\b/.test(f.name) || /location/i.test(f.label))
        .map((f) => f.value)
        .filter(Boolean)
        .join(", ");

      return {
        externalId: jobIdFromHref(href),
        title: clean(link.text()) ?? "",
        url: absoluteUrl(href, base),
        location: clean(location),
        moreLocations: false,
        date: fields.find((f) => /\bdate\b/.test(f.name))?.value ?? null,
        contractType: fields.find((f) => CONTRACT_LABEL.test(f.label))?.value ?? null,
      };
    });

  // The total and page size are only given to the "More results" script.
  const total = Number(html.match(/jobRecordsFound:\s*parseInt\("(\d+)"\)/)?.[1] ?? NaN);
  const perPage = Number(html.match(/jobRecordsPerPage:\s*parseInt\("(\d+)"\)/)?.[1] ?? NaN);
  if (items.length > 0 && (!Number.isFinite(total) || !Number.isFinite(perPage) || perPage <= 0)) {
    throw new Error("SuccessFactors: tile paging info (jobRecordsFound) not found");
  }
  const next = startRow + perPage;
  return { items, nextStartRow: next < total ? next : null };
}

function parseList(html: string, base: string, startRow: number): ListPage {
  const $ = cheerio.load(html);

  // No match: the fallback "most recent jobs" listed below are unrelated.
  if ($("#noresults").length > 0) return { items: [], nextStartRow: null };

  if ($("table#searchresults").length > 0) return parseTable($, base, startRow);
  if ($("ul#job-tile-list").length > 0) return parseTiles($, html, base, startRow);
  throw new Error("SuccessFactors: result list (#searchresults / #job-tile-list) not found");
}

/**
 * Microdata dates look like "Fri Nov 13 02:00:00 UTC 2026"; the calendar day
 * is the one shown on the page ("Date of posting: Nov 13, 2026").
 */
function parseMicrodataDate(value: string | undefined): string | null {
  const match = value?.match(/^[a-z]{3} ([a-z]{3}) (\d{1,2}) [\d:]+ \S+ (\d{4})$/i);
  return match ? parseDate(`${match[2]} ${match[1]} ${match[3]}`) : parseDate(value);
}

type Detail = {
  descriptionHtml: string;
  /** Every location of the offer (`.jobGeoLocation`), primary first. */
  locations: string[];
  publishedAt: string | null;
  closesAt: string | null;
  contractType: string | null;
};

function parseDetail(html: string, url: string): Detail {
  const $ = cheerio.load(html);

  const description = $(".jobdescription").first();
  if (description.length === 0) {
    throw new Error(`SuccessFactors: .jobdescription not found on ${url}`);
  }

  // Labelled fields: `<span class="joblayouttoken-label">Contract Type:</span>`
  // followed by a span holding the value.
  const contractType =
    $(".joblayouttoken-label")
      .toArray()
      .filter((label) => CONTRACT_LABEL.test($(label).text()))
      .map((label) => clean($(label).next().text()))
      .find(Boolean) ?? null;

  return {
    descriptionHtml: description.html() ?? "",
    locations: $(".jobGeoLocation")
      .toArray()
      .map((el) => clean($(el).text()))
      .filter((text): text is string => Boolean(text)),
    publishedAt: parseMicrodataDate($("meta[itemprop='datePosted']").attr("content")),
    closesAt: parseMicrodataDate($("meta[itemprop='validThrough']").attr("content")),
    contractType,
  };
}

export async function successFactors(
  ctx: ScrapeContext,
  { origin, searches, company }: SuccessFactorsOptions
): Promise<ScrapedJob[]> {
  const base = `${origin}/`;
  const byId = new Map<string, ListItem>();

  for (const search of searches) {
    let startRow: number | null = 0;
    for (let page = 0; startRow !== null; page++) {
      if (page >= MAX_PAGES) throw new Error(`SuccessFactors: more than ${MAX_PAGES} pages`);
      const params = new URLSearchParams({ q: "", ...search });
      if (startRow > 0) params.set("startrow", String(startRow));
      const result = parseList(await ctx.http.text(`${origin}/search/?${params}`), base, startRow);
      for (const item of result.items) {
        if (!byId.has(item.externalId)) byId.set(item.externalId, item);
      }
      startRow = result.nextStartRow;
    }
  }
  const list = [...byId.values()];
  ctx.log(`${list.length} offre(s) dans la recherche RDC, vérification des lieux…`);

  // The search is already restricted to the DRC; the location check is a
  // safety net. Multi-location rows are confirmed on their detail page.
  const candidates = list.filter((item) => item.moreLocations || isDrcLocation(item.location));

  const jobs = await Promise.all(
    candidates.map(async (item): Promise<ScrapedJob | null> => {
      const detail = parseDetail(await ctx.http.text(item.url), item.url);

      // For a multi-location offer, show its DRC location rather than the
      // primary one (e.g. "Espoo, FI").
      const location = [item.location, ...detail.locations].find(isDrcLocation);
      if (!location) {
        ctx.log(`Ignorée (hors RDC) : ${item.title} (${item.location ?? "lieu inconnu"})`);
        return null;
      }

      return {
        externalId: item.externalId,
        title: item.title,
        company,
        url: item.url,
        location,
        city: findDrcCity(location),
        contractType: normalizeContractType(item.contractType ?? detail.contractType),
        descriptionHtml: detail.descriptionHtml,
        publishedAt: detail.publishedAt ?? parseDate(item.date),
        closesAt: detail.closesAt,
      };
    })
  );
  return jobs.filter((job): job is ScrapedJob => job !== null);
}
