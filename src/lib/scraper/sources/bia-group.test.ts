import { describe, expect, it } from "vitest";
import { runSource } from "../run";
import { fixtureContext } from "../testing";
import source from "./bia-group";

describe("bia-group", () => {
  it("pages through the tile layout, keeps only DRC offers and reads their details", async () => {
    // The fixtures are hand-edited to 2 tiles per page (3 found) so that the
    // second page is requested, and a Zambia tile is slipped in as a safety net.
    const ctx = fixtureContext([
      { match: "/search/?q=&locationsearch=DRC&startrow=2", file: "bia-group/search-page2.html" },
      { match: "/search/?q=&locationsearch=DRC", file: "bia-group/search.html" },
      { match: "/1376194555/", file: "bia-group/job-1376194555.html" },
      { match: "/1368146355/", file: "bia-group/job-1368146355.html" },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.rejected).toEqual([]);
    expect(result.jobs.map((job) => job.title)).toEqual(["PSSR Team Leader", "Aftermarket Manager"]);
    // The Zambia offer is dropped without fetching its detail page.
    expect(ctx.requests.some((url) => url.includes("1372643655"))).toBe(false);

    expect(result.jobs[0]).toMatchObject({
      externalId: "1376194555",
      company: "BIA",
      url: "https://jobs.biagroup.com/job/DRC-PSSR-Team-Leader-DRC-DRC/1376194555/",
      location: "DRC",
      // BIA only gives the country, never the city.
      city: null,
      // "Contract Type: Permanent contract" on the detail page.
      contractType: "CDI",
      publishedAt: "2026-11-08",
      closesAt: null,
    });
    expect(result.jobs[0].descriptionHtml).toContain("About BIA");
    expect(result.jobs[1]).toMatchObject({ externalId: "1368146355", publishedAt: "2026-11-11" });
  });
});
