import * as cheerio from "cheerio";
import type { ScrapeContext, ScrapedJob } from "../types";
import { clean, findDrcCity, isInDrc, normalizeContractType, parseDate } from "../utils";

/**
 * SmartRecruiters public career sites.
 *
 * The Posting API (api.smartrecruiters.com/v1/companies/{company}/postings)
 * would be the natural choice, but its robots.txt only allows LinkedInBot
 * (`User-agent: * / Disallow: /`), so we read the public HTML pages instead,
 * whose hosts have no robots.txt (careers.* redirects it to the homepage,
 * jobs.* answers 404):
 *
 * 1. `careers.smartrecruiters.com/{company}?search={term}` lists the matching
 *    offers grouped by location. Every group is rendered at once for a
 *    search, but each one shows at most 9 offers; the rest is loaded from
 *    `/{company}/api/more?type=location&value=…&page=N`, an HTML fragment
 *    listing every offer of that location (not only the search matches),
 *    about 10 per page from page 0.
 * 2. `jobs.smartrecruiters.com/{company}/{id}` is the offer page, annotated
 *    with schema.org `JobPosting` microdata (title, location, date, sections).
 */

const CAREERS = "https://careers.smartrecruiters.com";
const JOBS = "https://jobs.smartrecruiters.com";

type Listing = { id: string; groupLocation: string };

/** Posting id from `https://jobs.smartrecruiters.com/SGS/744000125305285-quality-manager`. */
function postingId(href: string | undefined): string | null {
  return href?.match(/smartrecruiters\.com\/[^/]+\/(\d+)(?:[-/?#]|$)/)?.[1] ?? null;
}

/** Posting ids of the offer links (default: all those of the page or fragment). */
function linkIds($: cheerio.CheerioAPI, links = $("a.js-job-ad-link")): string[] {
  return links
    .toArray()
    .map((a) => postingId($(a).attr("href")))
    .filter((id): id is string => id !== null);
}

/** Offers of the DRC location groups of the search results page. */
async function listDrcPostings(
  ctx: ScrapeContext,
  company: string,
  search: string
): Promise<Listing[]> {
  const html = await ctx.http.text(`${CAREERS}/${company}?search=${encodeURIComponent(search)}`);
  const $ = cheerio.load(html);

  // "No jobs found matching your search criteria".
  if ($("#st-noOpeningsFound").length) return [];
  const groups = $(".js-openings section.js-group");
  if (!groups.length) throw new Error("Liste des offres introuvable (structure modifiée ?)");

  const listings: Listing[] = [];
  for (const element of groups.toArray()) {
    const group = $(element);
    // Group header, e.g. "Kolwazi, Democratic Republic of the Congo".
    const groupLocation = clean(group.find(".opening-title").first().text()) ?? "";
    if (!isInDrc(groupLocation)) continue;

    const ids = new Set(linkIds($, group.find("a.js-job-ad-link")));
    const expected = Number(group.attr("data-qty")) || ids.size;

    // Truncated group: fetch the remaining offers like the "Show more" button.
    if (ids.size < expected) {
      const more = group.find("[data-more]").first();
      const [path, type, value] = [more.attr("data-more"), more.attr("data-type"), more.attr("data-value")];
      if (!path || !type || !value) {
        throw new Error(`Groupe « ${groupLocation} » tronqué sans lien « voir plus »`);
      }
      // The fragment lists the whole location group, newest first, from page
      // 0. Page 0 is not skipped: it only repeats the visible offers when they
      // are the newest ones, which a search does not guarantee. `expected`
      // bounds the loop; an empty page, or a later page without new offers,
      // ends it early.
      for (let page = 0; page <= expected && ids.size < expected; page++) {
        // `value` is already percent-encoded in the attribute.
        const fragment = await ctx.http.text(
          `${CAREERS}${path}?page=${page}&type=${encodeURIComponent(type)}&value=${value}`
        );
        const found = linkIds(cheerio.load(fragment, null, false));
        const fresh = found.filter((id) => !ids.has(id));
        fresh.forEach((id) => ids.add(id));
        if (!found.length || (page > 0 && !fresh.length)) break;
      }
    }

    ids.forEach((id) => listings.push({ id, groupLocation }));
  }
  return listings;
}

/** Remove consecutive duplicates: "Kolwazi, Kolwazi, DRC" → "Kolwazi, DRC". */
function dedupeParts(location: string | null | undefined): string | null {
  const parts = (location ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part, i, all) => part && part !== all[i - 1]);
  return parts.length ? parts.join(", ") : null;
}

async function fetchPosting(
  ctx: ScrapeContext,
  { company, displayName }: { company: string; displayName: string },
  { id, groupLocation }: Listing
): Promise<ScrapedJob | null> {
  const url = `${JOBS}/${company}/${id}`;
  const $ = cheerio.load(await ctx.http.text(url));

  const main = $('main[itemtype$="schema.org/JobPosting"]');
  if (!main.length) throw new Error(`Offre ${id} : microdonnées JobPosting introuvables`);

  const meta = (prop: string) => clean(main.find(`meta[itemprop="${prop}"]`).first().attr("content"));
  const locality = meta("addressLocality");
  const location =
    dedupeParts(main.find("spl-job-location").attr("formattedaddress")) ?? groupLocation;

  // The listing groups by location already; double-check the offer itself.
  if (!isInDrc(location, meta("addressCountry"))) {
    ctx.log(`offre ${id} ignorée : lieu « ${location} » hors RDC`);
    return null;
  }

  const description = main.find('[itemprop="description"]').first();
  return {
    externalId: id,
    title: clean(main.find('[itemprop="title"]').first().text()) ?? "",
    company: displayName,
    url,
    location,
    // Cities are sometimes misspelled (SGS: "Kolwazi"): keep the raw value then.
    city: findDrcCity(location) ?? locality,
    contractType: normalizeContractType(main.find('[itemprop="employmentType"]').first().text()),
    descriptionHtml: description.length ? description.html() : null,
    publishedAt: parseDate(meta("datePosted")),
  };
}

export async function smartRecruiters(
  ctx: ScrapeContext,
  {
    company,
    displayName,
    search = "Congo",
  }: {
    /** Company identifier in SmartRecruiters URLs (case sensitive, e.g. "SGS"). */
    company: string;
    displayName: string;
    /**
     * Full-text search narrowing the listing; it also matches the location,
     * so "Congo" returns the DRC groups (non-DRC matches are filtered out).
     */
    search?: string;
  }
): Promise<ScrapedJob[]> {
  const listings = await listDrcPostings(ctx, company, search);
  ctx.log(`${listings.length} offre(s) en RDC, lecture des détails…`);

  const jobs = await Promise.all(
    listings.map((listing) => fetchPosting(ctx, { company, displayName }, listing))
  );
  return jobs.filter((job): job is ScrapedJob => job !== null);
}
