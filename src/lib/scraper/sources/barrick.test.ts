import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { oracleHcm } from "../adapters/oracle-hcm";
import type { RequestOptions } from "../http";
import { runSource } from "../run";
import { fixtureContext } from "../testing";
import source from "./barrick";

const SEARCH = "recruitingCEJobRequisitions?";
const DETAIL = /recruitingCEJobRequisitionDetails\?.*Id=%22(\d+)%22/;

/** The API ignores `locationId` unless the request is in English. */
const inEnglish = (options: RequestOptions | undefined) =>
  options?.headers?.["accept-language"] === "en";

/**
 * `requisitions.json` is a real DRC-filtered search response trimmed to two
 * offers, plus one real Tanzanian offer (243192) copied from the unfiltered
 * board to check that the DRC filter is re-applied locally (the API ignores
 * an unknown `locationId`). Descriptions of the detail fixtures are truncated.
 * They were fetched through the CX_1 alias, which serves the same data as CX_1001.
 */
const routes = [
  { match: SEARCH, when: inEnglish, file: "barrick/requisitions.json" },
  { match: "Id=%22240630%22", when: inEnglish, file: "barrick/requisition-240630.json" },
  { match: "Id=%22241700%22", when: inEnglish, file: "barrick/requisition-241700.json" },
];

type SearchResponse = {
  items: { TotalJobsCount: number; requisitionList: Record<string, unknown>[] }[];
};

const searchFixture = (): SearchResponse =>
  JSON.parse(
    readFileSync(
      path.join(import.meta.dirname, "__fixtures__", "barrick", "requisitions.json"),
      "utf8"
    )
  );

describe("barrick", () => {
  it("keeps only DRC offers and normalises them", async () => {
    const ctx = fixtureContext(routes);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.rejected).toEqual([]);
    // The Shinyanga (Tanzania) offer is filtered out, and its detail never requested.
    expect(result.jobs.map((job) => job.externalId)).toEqual(["240630", "241700"]);
    expect(ctx.requests.filter((url) => DETAIL.test(url))).toHaveLength(2);
    // Server-side filter on the "DR Congo-Kinshasa" geography, on the live site.
    expect(ctx.requests[0]).toContain("siteNumber=CX_1001,");
    expect(ctx.requests[0]).toContain("locationId=300000000273763");

    expect(result.jobs[0]).toMatchObject({
      externalId: "240630",
      title: "Underground Fitter",
      company: "Kibali Gold Mines",
      url: "https://ehkn.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/job/240630",
      location: "Durba, Haut Uele, DR Congo-Kinshasa",
      // Not "Kinshasa", despite the "DR Congo-Kinshasa" country label.
      city: "Durba",
      contractType: null,
      publishedAt: "2026-11-13",
      closesAt: "2026-11-20",
      vacancies: null,
      level: null,
    });
    expect(result.jobs[0].descriptionHtml).toContain("Underground Fitter");
    expect(result.jobs[0].descriptionHtml).not.toMatch(/style=/);
    // Open-ended posting: no closing date.
    expect(result.jobs[1]).toMatchObject({ title: "Jumbo Operator", publishedAt: "2026-08-12", closesAt: null });
  });

  it("pages through the search results with offset", async () => {
    const [page] = searchFixture().items;
    const pageBody = (rows: unknown[]) => ({
      items: [{ ...page, TotalJobsCount: 3, requisitionList: rows }],
    });
    const ctx = fixtureContext([
      { match: /recruitingCEJobRequisitions\?.*offset=0,/, body: pageBody(page.requisitionList.slice(0, 2)) },
      { match: /recruitingCEJobRequisitions\?.*offset=2,/, body: pageBody(page.requisitionList.slice(2)) },
      ...routes.slice(1),
    ]);

    const jobs = await oracleHcm(ctx, {
      host: "ehkn.fa.ca2.oraclecloud.com",
      siteNumber: "CX_1001",
      company: "Barrick",
      pageSize: 2,
    });

    expect(jobs.map((job) => job.externalId)).toEqual(["240630", "241700"]);
    // Without `resolveCompany`, the default company is used.
    expect(jobs[0].company).toBe("Barrick");
    expect(ctx.requests.filter((url) => url.includes(SEARCH))).toHaveLength(2);
  });

  it("skips offers unposted before their detail is fetched", async () => {
    const [page] = searchFixture().items;
    // Country-level posting (Oracle also has "United States", "Canada"…).
    const rows = page.requisitionList.map((row) =>
      row.Id === "240630" ? { ...row, PrimaryLocation: "DR Congo-Kinshasa" } : row
    );
    const ctx = fixtureContext([
      { match: SEARCH, body: { items: [{ ...page, requisitionList: rows }] } },
      routes[1],
      { match: "Id=%22241700%22", body: { items: [] } },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.jobs.map((job) => job.externalId)).toEqual(["240630"]);
    // The country label is not mistaken for the city of Kinshasa.
    expect(result.jobs[0]).toMatchObject({ location: "DR Congo-Kinshasa", city: null, company: "Barrick" });
  });

  it("returns no offer when nothing is open in the DRC", async () => {
    const ctx = fixtureContext([
      { match: SEARCH, body: { items: [{ TotalJobsCount: 0, requisitionList: [] }] } },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.jobs).toEqual([]);
    expect(ctx.requests).toHaveLength(1);
  });

  it("fails loudly when the search response changes", async () => {
    const ctx = fixtureContext([{ match: SEARCH, body: { items: [] } }]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/requisitionList missing/);
  });
});
