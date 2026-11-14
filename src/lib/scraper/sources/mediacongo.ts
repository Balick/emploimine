/**
 * Mediacongo: the main general job-ad site of the DRC ("Offres d'emploi").
 * Every kind of employer publishes there (NGOs, banks, mining companies…), so
 * only the mining offers are kept.
 *
 * Endpoint: the keyword search, server-rendered HTML,
 *   https://www.mediacongo.net/emplois-search-<keyword>-tri-offres_recentes-page-<n>.html
 * The search only matches the title, the MCN reference and the advertiser
 * name (substring match: "mine" finds "KIBALI GOLDMINE SA", but also
 * "durée déterminée"), so a few mining keywords are searched and every hit
 * then goes through a mining keyword filter on title + advertiser +
 * description (see `isMiningOffer`). Each result row carries a status class:
 * clas1 "En cours", clas2 "Moins de 3 jours", clas3 "Expirée", clas4
 * "Non précisé"; expired rows are dropped, and so are the recruitment notices
 * the site lists as rows ("Liste de candidats retenus : …"). The offer page
 * (emploi-societe-<id>_<slug>.html) gives the location, advertiser and the
 * description, which is often only scanned images of the ad (turned into
 * links). There is no structured deadline: `closesAt` is only read from an
 * explicit "date limite / au plus tard le …" sentence of the description.
 *
 * robots.txt: `User-agent: *` with `Crawl-delay: 10` and no Disallow. The
 * runner spaces requests to www.mediacongo.net by 10 s (HOST_DELAYS_MS), so
 * the work is bounded (5 keywords x <= 2 pages, <= 20 offer pages) and the
 * timeout raised accordingly. Works with the bot User-Agent.
 * Verified 2026-11-14 (2 mining offers, both Kibali Goldmine at Durba;
 * "minier", "mining", "copper" and "cobalt" return no result today).
 */
import * as cheerio from "cheerio";
import { defineSource, type ScrapeContext, type ScrapedJob } from "../types";
import { absoluteUrl, clean, findDrcCity, isInDrc, normalizeContractType, parseDate } from "../utils";

const BASE_URL = "https://www.mediacongo.net/";
/** Substrings searched in title/reference/advertiser ("minier" also finds "minière"). */
const SEARCH_KEYWORDS = ["mine", "minier", "mining", "copper", "cobalt"];
/** Result pages hold 30 rows; mining hits rarely fill one. */
const MAX_PAGES_PER_KEYWORD = 2;
/** Offer pages fetched at most (10 s each because of the Crawl-delay). */
const MAX_OFFERS = 20;

const searchUrl = (keyword: string, page: number) =>
  `${BASE_URL}emplois-search-${encodeURIComponent(keyword)}-tri-offres_recentes-page-${page}.html`;

/** Lowercase and remove accents, to match French text with plain regexes. */
const fold = (value: string) =>
  value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Words that make an offer mining-related, matched on folded text. Kept
 * specific on purpose: the generic search hits ("déterminée", "examine"…) must
 * not pass. Group names ("gecamines", "sicomines", "goldmine") are listed
 * because `\bmines?\b` does not match inside them.
 */
const MINING_PATTERN =
  /\b(mines?|miniers?|minieres?|mining|goldmines?|gecamines|sicomines|copper|cuivre|cobalt|lithium|geolog\w*|metallurg\w*|hydrometallurg\w*|concentrateur)\b/;
/** Humanitarian demining also talks about "mines": never a mining job. */
const DEMINING_PATTERN = /\b(deminage|demineurs?|anti-?personnel|landmines?|restes explosifs|mine action)\b/;

/** True when the offer is about the mining industry (see patterns above). */
export function isMiningOffer(...texts: (string | null | undefined)[]): boolean {
  const text = fold(texts.filter(Boolean).join(" | "));
  return MINING_PATTERN.test(text) && !DEMINING_PATTERN.test(text);
}

/**
 * Notices published as rows of the job list but that are not offers, e.g.
 * "Liste de candidats retenus : Spécialiste en Passation des Marchés".
 */
const NOTICE_PATTERN =
  /\b(listes? des? candidats?|candidats? (retenus?|preselectionnes?|admis|selectionnes?)|shortlist(ed)?|communique)\b/;

/** True when a listing title is an announcement about a past recruitment, not an offer. */
export function isNotice(title: string): boolean {
  return NOTICE_PATTERN.test(fold(title));
}

/**
 * Explicit contract words in a title, e.g. "Géologue minier (CDD)". The whole
 * title is not given to `normalizeContractType`: job names such as "Contract
 * Manager", "Graduate Trainee" or "Auditeur interne" would be read as a
 * contract type.
 */
const CONTRACT_TERM = /\b(cdd|cdi|stagiaires?|stage|interim|temporaire|consultance|consultante?s?|freelance)\b/;

export function contractTypeFromTitle(title: string) {
  return normalizeContractType(fold(title).match(CONTRACT_TERM)?.[0]);
}

/** Deadline sentence of a description, e.g. "au plus tard le 11/11/2026". */
const DEADLINE_PATTERN =
  /(?:date limite|au plus tard|deadline|date de cloture|cloture des candidatures)[^0-9]{0,40}?(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{1,2}(?:er)?\s+[a-z]+\.?\s+\d{4})/;

function findDeadline(text: string): string | null {
  const match = fold(text).match(DEADLINE_PATTERN);
  return match ? parseDate(match[1]) : null;
}

/** One row of a search result page. */
type ListedOffer = {
  id: string;
  url: string;
  title: string;
  company: string | null;
  location: string | null;
  publishedAt: string | null;
  expired: boolean;
};

function parseSearchPage(html: string, pageUrl: string, page: number) {
  const $ = cheerio.load(html);
  const table = $("table.table_datas");
  if (!table.length) throw new Error(`Tableau des offres introuvable sur ${pageUrl}`);

  const offers: ListedOffer[] = [];
  // Data rows are the ones with a status cell; the header row has none and the
  // sponsored row above the results is commented out in the HTML.
  table.find("tr").each((_, tr) => {
    const status = $(tr).children("td.tdclas");
    if (!status.length) return;
    const cells = $(tr).children("td");
    const href = cells.eq(1).find("a").attr("href");
    const id = href?.match(/emploi-societe-(\d+)/)?.[1];
    const title = clean(cells.eq(1).find("strong").first().text());
    if (!href || !id || !title) throw new Error(`Ligne d'offre inattendue sur ${pageUrl}`);
    offers.push({
      id,
      url: absoluteUrl(href, BASE_URL),
      title,
      company: clean(cells.eq(2).text()),
      location: clean(cells.eq(3).text()),
      // "26.10.2026"
      publishedAt: parseDate(clean(cells.eq(4).text())),
      expired: status.hasClass("clas3"),
    });
  });

  const hasNextPage = $(".pagination a.navpage")
    .toArray()
    .some((a) => clean($(a).text()) === String(page + 1));
  return { offers, hasNextPage };
}

/** Searches one keyword, following at most MAX_PAGES_PER_KEYWORD pages. */
async function search(ctx: ScrapeContext, keyword: string) {
  const offers: ListedOffer[] = [];
  for (let page = 1; page <= MAX_PAGES_PER_KEYWORD; page++) {
    const url = searchUrl(keyword, page);
    const result = parseSearchPage(await ctx.http.text(url), url, page);
    offers.push(...result.offers);
    if (!result.hasNextPage) break;
  }
  return offers;
}

type OfferPage = {
  title: string | null;
  company: string | null;
  location: string | null;
  publishedAt: string | null;
  expired: boolean;
  descriptionHtml: string | null;
  descriptionText: string;
};

function parseOfferPage(html: string, url: string): OfferPage {
  const $ = cheerio.load(html);
  const title = clean($("h1").first().text());

  // The page is a list of `<div class="emploi_section">Label</div>` each
  // followed by its `<div class="article_ttext">` content.
  const sections = new Map<string, ReturnType<typeof $>>();
  $(".emploi_section").each((_, el) => {
    sections.set(fold(clean($(el).text()) ?? ""), $(el).nextAll(".article_ttext").first());
  });
  const description = sections.get("description");
  if (!title || !description?.length) throw new Error(`Structure inattendue de l'offre ${url}`);

  // Many ads are only scanned images of the printed ad: keep them as links,
  // since the sanitizer drops <img>.
  description.find("img").each((index, img) => {
    const src = $(img).attr("src");
    if (!src) return void $(img).remove();
    $(img).replaceWith(
      $("<a>").attr("href", absoluteUrl(src, url)).text(`Voir l'annonce (image ${index + 1})`)
    );
  });

  const date = $(".adate").first();
  return {
    title,
    company: clean(sections.get("organisme")?.text()),
    location: clean(sections.get("lieu")?.text()),
    // "Publiée le 26/10/2026  | Réf. MCN : OEM45045"
    publishedAt: parseDate(date.text().match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0]),
    expired: date.hasClass("clas3"),
    // The CMS stores some descriptions with literal "\r\n" between tags.
    descriptionHtml: description.html()?.replace(/\\r\\n/g, "\n").trim() || null,
    descriptionText: clean(description.text().replace(/\\r\\n/g, " ")) ?? "",
  };
}

async function scrape(ctx: ScrapeContext): Promise<ScrapedJob[]> {
  // Several keywords can find the same offer: de-duplicate by id.
  const listed = new Map<string, ListedOffer>();
  for (const keyword of SEARCH_KEYWORDS) {
    for (const offer of await search(ctx, keyword)) listed.set(offer.id, offer);
  }

  const candidates = [...listed.values()].filter((offer) => {
    if (offer.expired || isNotice(offer.title)) return false;
    if (!isInDrc(offer.location)) {
      ctx.log(`Hors RDC ou lieu inconnu, ignorée : ${offer.title} (${offer.location ?? "?"})`);
      return false;
    }
    return true;
  });
  // Bounded because of the 10 s Crawl-delay: rows already mining-related by
  // their title or advertiser come first, so search noise ("durée
  // déterminée"…) cannot push them out; then the most recent first.
  const listedAsMining = (offer: ListedOffer) => isMiningOffer(offer.title, offer.company);
  candidates.sort(
    (a, b) =>
      Number(listedAsMining(b)) - Number(listedAsMining(a)) ||
      (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")
  );
  if (candidates.length > MAX_OFFERS) {
    ctx.log(`${candidates.length} offres candidates, seules les ${MAX_OFFERS} plus récentes sont lues`);
  }
  const selected = candidates.slice(0, MAX_OFFERS);
  ctx.log(`${listed.size} résultat(s) de recherche, ${selected.length} offre(s) à lire…`);

  const today = new Date().toISOString().slice(0, 10);
  const jobs = await Promise.all(
    selected.map(async (offer): Promise<ScrapedJob | null> => {
      const page = parseOfferPage(await ctx.http.text(offer.url), offer.url);
      const company = page.company ?? offer.company;
      if (!company) {
        ctx.log(`Annonceur absent, ignorée : ${offer.url}`);
        return null;
      }
      if (!isMiningOffer(offer.title, company, page.descriptionText)) return null;

      const closesAt = findDeadline(page.descriptionText);
      if (page.expired || (closesAt && closesAt < today)) return null;

      const location = page.location ?? offer.location;
      return {
        externalId: offer.id,
        title: offer.title,
        // Advertiser as typed on the site (often upper case, e.g. "KIBALI GOLDMINE SA").
        company,
        url: offer.url,
        location,
        city: findDrcCity(location),
        contractType: contractTypeFromTitle(offer.title),
        descriptionHtml: page.descriptionHtml,
        publishedAt: offer.publishedAt ?? page.publishedAt,
        closesAt,
      };
    })
  );
  return jobs.filter((job) => job !== null);
}

export default defineSource({
  id: "mediacongo",
  name: "Mediacongo",
  website: "https://www.mediacongo.net/emplois.html",
  kind: "job_board",
  // Up to 10 search pages + 20 offer pages, 10 s apart.
  timeoutMs: 8 * 60_000,
  scrape,
});
