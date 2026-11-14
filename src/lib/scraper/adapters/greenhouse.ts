import * as cheerio from "cheerio";
import type { ScrapeContext, ScrapedJob } from "../types";
import { findDrcCity, isInDrc, parseDate } from "../utils";

/**
 * Greenhouse public Job Board API (no key needed).
 * Docs: https://developers.greenhouse.io/job-board.html
 */
type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  company_name?: string;
  location: { name: string } | null;
  first_published?: string;
  updated_at?: string;
  application_deadline?: string | null;
  /** HTML, entity-encoded (`&lt;p&gt;`). */
  content?: string;
};

export async function greenhouse(
  ctx: ScrapeContext,
  { board, company }: { board: string; company: string }
): Promise<ScrapedJob[]> {
  const { jobs } = await ctx.http.json<{ jobs: GreenhouseJob[] }>(
    `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`
  );
  ctx.log(`${jobs.length} offre(s) sur le board, filtrage RDC…`);

  return jobs
    .filter((job) => isInDrc(job.location?.name))
    .map((job) => ({
      externalId: String(job.id),
      title: job.title,
      company,
      url: job.absolute_url,
      location: job.location?.name,
      city: findDrcCity(job.location?.name),
      descriptionHtml: job.content ? cheerio.load(job.content, null, false).text() : null,
      publishedAt: parseDate(job.first_published ?? job.updated_at),
      closesAt: parseDate(job.application_deadline),
    }));
}
