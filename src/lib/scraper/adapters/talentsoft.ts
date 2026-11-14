import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";
import type { ScrapeContext, ScrapedJob } from "../types";
import { clean, findDrcCity, isInDrc, normalizeContractType, parseDate } from "../utils";

/**
 * Talent-soft (Cegid Talent) career sites.
 *
 * Every tenant exposes a public RSS feed of its open offers, filtered by
 * country: `https://{tenant}.talent-soft.com/handlers/offerRss.ashx?LCID=…&Rss_JobCountry={id}`.
 * Country ids are NOT shared between tenants (DRC is 60 for AGL but 158 for
 * CIS; 60 is Colombia for CIS), so each source must check the id against the
 * country tree of its own site. The feed's channel title echoes the selected
 * country ("… Pays : Afrique-->Rép démocratique du Congo"), which we use to
 * fail loudly if an id ever stops pointing to the DRC.
 *
 * The feed items have a title prefixed with the offer reference, a link, a
 * pubDate and a description, but no location, and their `<category>` values
 * are tenant-specific (function + contract for AGL, contract + head-office
 * address for CIS). The offer page, on the other hand, uses the same field ids
 * on every tenant (`#fldlocation_location_geographicalareacollection`,
 * `#fldjobdescription_contract`, `#fldjobdescription_description1|2`), with
 * the city when the recruiter filled it in. So we fetch the offer page of each
 * feed item: there are only a handful per country.
 */

type RssItem = {
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  category?: string | string[];
};

type RssFeed = {
  rss?: {
    channel?: {
      title?: string;
      item?: RssItem | RssItem[];
    };
  };
};

type OfferPage = {
  location: string | null;
  contract: string | null;
  descriptionHtml: string | null;
};

const parser = new XMLParser({
  ignoreAttributes: true,
  // Keep titles such as "2026-1290 - …" or "1033" as strings.
  parseTagValue: false,
  trimValues: true,
});

/**
 * Talent-soft spells the DRC "Rép démocratique du Congo" on some tenants,
 * which `isInDrc` does not know. Expand the abbreviation before matching.
 */
function expandCountry(value: string | null | undefined): string | null {
  return value?.replace(/\bR[ée]p\.?\s+(d[ée]mocratique)/gi, "République $1") ?? null;
}

/** "Afrique, République Démocratique du Congo, LUBUMBASHI" → "LUBUMBASHI, République Démocratique du Congo". */
function formatLocation(value: string | null): string | null {
  if (!value) return null;
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !/^(afrique|africa)$/i.test(part));
  return parts.length ? parts.reverse().join(", ") : null;
}

/** Parse the fields we need from an offer page; `null` when it is not one. */
function parseOfferPage(html: string): OfferPage | null {
  const $ = cheerio.load(html);
  const location = $("#fldlocation_location_geographicalareacollection");
  const description1 = $("#fldjobdescription_description1");
  // A delisted offer redirects to the home page, which has none of these.
  if (!location.length && !description1.length) return null;

  // "Mission description" and "Profile", each introduced by its own <h3>.
  const descriptionHtml = ["#fldjobdescription_description1", "#fldjobdescription_description2"]
    .map((selector) => {
      const field = $(selector);
      const body = field.html()?.trim();
      if (!body) return "";
      // Headings are padded with &nbsp;, which `clean` collapses (\s matches U+00A0).
      const heading = clean(field.prevAll("h3").first().text());
      // Plain text with <br /> on some tenants (AGL), rich text with its own
      // <p>/<ul> on others (CIS): only wrap the former in a paragraph.
      const tag = /<(p|div|ul|ol|table)\b/i.test(body) ? "div" : "p";
      return `${heading ? `<h3>${heading}</h3>` : ""}<${tag}>${body}</${tag}>`;
    })
    .join("");

  return {
    location: clean(location.text()),
    contract: clean($("#fldjobdescription_contract").text()),
    descriptionHtml: descriptionHtml || null,
  };
}

export async function talentsoft(
  ctx: ScrapeContext,
  {
    host,
    countryId,
    lcid = 1036,
    company,
  }: {
    /** Tenant host, e.g. "acareerbyagl.talent-soft.com". */
    host: string;
    /** The tenant's own id of the DRC in its country tree. */
    countryId: number;
    /** Language of the feed: 1036 = French, 1033 = English. */
    lcid?: number;
    company: string;
  }
): Promise<ScrapedJob[]> {
  const feedUrl = `https://${host}/handlers/offerRss.ashx?LCID=${lcid}&Rss_JobCountry=${countryId}`;
  const feed = parser.parse(await ctx.http.text(feedUrl)) as RssFeed;
  const channel = feed.rss?.channel;
  if (!channel) throw new Error(`Flux RSS Talent-soft inattendu (pas de <channel>) : ${feedUrl}`);

  // "… / Pays : Afrique-->Rép démocratique du Congo" → "Rép démocratique du Congo"
  const feedCountry = expandCountry(channel.title?.split("-->").pop());
  if (!isInDrc(feedCountry)) {
    throw new Error(`Rss_JobCountry=${countryId} ne pointe pas vers la RDC : "${channel.title}"`);
  }

  // A single <item> is parsed as an object, no <item> at all as undefined.
  const items = [channel.item ?? []].flat();
  ctx.log(`${items.length} offre(s) dans le flux RDC, lecture des fiches…`);

  let unreadable = 0;
  const jobs = await Promise.all(
    items.map(async (item): Promise<ScrapedJob | null> => {
      if (!item.link || !item.title) throw new Error(`Item RSS incomplet : ${JSON.stringify(item)}`);
      const url = item.link;
      const externalId = new URL(url).searchParams.get("idOffre");
      if (!externalId) throw new Error(`Lien d'offre sans idOffre : ${url}`);

      const page = parseOfferPage(await ctx.http.text(url));
      if (!page) {
        unreadable++;
        ctx.log(`Offre ${externalId} retirée entre le flux et la fiche, ignorée`);
        return null;
      }

      // Offers without a filled-in location are trusted to the feed's country filter.
      const location = expandCountry(page.location ?? feedCountry);
      if (!isInDrc(location)) return null;

      // "2026-9664 - Développeur Commercial … H/F - LUBUMBASHI": drop the reference.
      const title = item.title.replace(/^\s*\d{4}-\d+\s+-\s+/, "");
      // The city is sometimes only in the title (e.g. "… - LUBUMBASHI").
      const city = findDrcCity(location) ?? findDrcCity(title);

      return {
        externalId,
        title,
        company,
        url,
        location: formatLocation(location),
        city,
        contractType: normalizeContractType(page.contract),
        // The RSS description is complete but uses bare newlines for line
        // breaks; the offer page has the same text with proper <br />.
        descriptionHtml: page.descriptionHtml ?? item.description ?? null,
        publishedAt: parseDate(item.pubDate),
      };
    })
  );

  // One delisted offer is normal; none of the pages being readable means the
  // page template changed.
  if (items.length > 0 && unreadable === items.length) {
    throw new Error("Aucune fiche d'offre lisible : la structure des pages a changé ?");
  }
  return jobs.filter((job): job is ScrapedJob => job !== null);
}
