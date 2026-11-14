import * as cheerio from "cheerio";
import type { ScrapeContext, ScrapedJob } from "../types";
import { absoluteUrl, clean, findDrcCity, isInDrc, normalizeContractType, parseDate } from "../utils";

/**
 * Simplify.hr ATS (South African HR platform), one sub-domain per employer:
 * `https://<tenant>.simplify.hr/`.
 *
 * The careers home page loads its "Current Vacancies" block by AJAX from a
 * plain HTML fragment (`/vacancy/vacancies`), which lists every open vacancy
 * at once (no paging) with title, location and dates. The description,
 * contract type and division are only on the public detail page
 * (`/Vacancy/<code>`), so details are fetched for the DRC offers only.
 *
 * robots.txt (same on every tenant, checked 2026-11-14): `Allow: /` for `*`,
 * only `/Vacancy/Apply/*` is disallowed, and we never request it.
 */

/** What is known about a vacancy once its detail page has been read. */
export type SimplifyVacancy = {
  title: string;
  location: string | null;
  /** "Division" field of the detail page, e.g. "Ivanhoe Mines DRC (IMD)". */
  division: string | null;
  /** Company/branch shown under the title, e.g. "Ivanhoe Mines". */
  branch: string | null;
};

type SimplifyOptions = {
  /** Sub-domain of simplify.hr, e.g. "ivanhoemines". */
  tenant: string;
  /** Default display name of the employer. */
  company: string;
  /**
   * Optional refinement of `company` for multi-entity groups (e.g. a vacancy
   * of a subsidiary posted on the parent's board). Return `null` to keep the
   * default.
   */
  resolveCompany?: (vacancy: SimplifyVacancy) => string | null;
};

/**
 * Text of the empty state, e.g. "There are currently no open jobs listed…"
 * (live wording on 2026-11-14; tenants may say "no vacancies" instead).
 */
const EMPTY_STATE = /\bno (open |current )?(jobs|vacancies|positions)\b/i;

type ListItem = {
  externalId: string;
  title: string;
  url: string;
  location: string | null;
  publishedAt: string | null;
  closesAt: string | null;
};

function parseList(html: string, base: string): ListItem[] {
  const $ = cheerio.load(html, null, false);

  if ($(".job-section").length === 0) {
    if (EMPTY_STATE.test($.root().text())) return [];
    throw new Error("Simplify: vacancy list container (.job-section) not found");
  }

  return $(".job-section .job-title a")
    .toArray()
    .map((link) => {
      const href = $(link).attr("href") ?? "";
      // Vacancy codes are numeric (`/Vacancy/210399`) and stable.
      const code = href.match(/\/vacancy\/(\d+)/i)?.[1];
      if (!code) throw new Error(`Simplify: unexpected vacancy link "${href}"`);

      const item = $(link).closest(".col-md-8");
      // Rows are unlabelled: "Published 03 November 2026",
      // "Closing Date: <b>17 November 2026</b>".
      const rowText = (prefix: RegExp) =>
        item
          .children(".row")
          .toArray()
          .map((row) => clean($(row).text()) ?? "")
          .find((text) => prefix.test(text)) ?? null;

      return {
        externalId: code,
        title: clean($(link).text()) ?? "",
        url: absoluteUrl(href, base),
        // The tooltip `title` attribute is often empty, the text is not.
        location: clean(item.find(".job-location").text()),
        publishedAt: parseDate(rowText(/^published\b/i)),
        closesAt: parseDate(rowText(/^closing date\b/i)),
      };
    });
}

type Detail = {
  descriptionHtml: string | null;
  contractType: string | null;
  division: string | null;
  branch: string | null;
  level: string | null;
};

function parseDetail(html: string, url: string): Detail {
  const $ = cheerio.load(html);

  const description = $(".vacancy-description").first();
  if (description.length === 0) {
    throw new Error(`Simplify: .vacancy-description not found on ${url}`);
  }

  // "Job Details" rows: `<label class="job-detail-bold-header" for="X">Name</label>`
  // followed by the value (a label or a span), inside the same `.row`.
  const field = (key: string) => {
    const row = $(`label.job-detail-bold-header[for="${key}"]`).first().parent().clone();
    row.find("label.job-detail-bold-header").remove();
    return clean(row.text());
  };

  return {
    descriptionHtml: description.html()?.trim() || null,
    contractType: clean($(".hero-vacancy-type").text()),
    division: field("Vacancy_DivisionName"),
    branch: clean($(".hero-vacancy-home").text()),
    // "Minimum experience" holds a seniority level (Associate, Mid-Senior…).
    level: field("MinimumExperience"),
  };
}

export async function simplify(
  ctx: ScrapeContext,
  { tenant, company, resolveCompany }: SimplifyOptions
): Promise<ScrapedJob[]> {
  const base = `https://${tenant}.simplify.hr/`;
  const list = parseList(
    await ctx.http.text(`${base}vacancy/vacancies?query=&displayOrder=0`),
    base
  );
  ctx.log(`${list.length} offre(s) sur le site, filtrage RDC…`);

  // A vacancy without location may still name its DRC site in the title.
  const drc = list.filter((item) => isInDrc(item.location ?? item.title));

  return Promise.all(
    drc.map(async (item): Promise<ScrapedJob> => {
      const detail = parseDetail(await ctx.http.text(item.url), item.url);
      return {
        externalId: item.externalId,
        title: item.title,
        company:
          resolveCompany?.({
            title: item.title,
            location: item.location,
            division: detail.division,
            branch: detail.branch,
          }) ?? company,
        url: item.url,
        location: item.location,
        city: findDrcCity(item.location ?? item.title),
        contractType: normalizeContractType(detail.contractType),
        descriptionHtml: detail.descriptionHtml,
        publishedAt: item.publishedAt,
        closesAt: item.closesAt,
        level: detail.level,
      };
    })
  );
}
