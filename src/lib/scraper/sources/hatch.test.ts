import { describe, expect, it } from "vitest";
import { runSource } from "../run";
import { fixtureContext } from "../testing";
import source from "./hatch";

const SEARCH = "/search/?q=&optionsFacetsDD_country=CD";

describe("hatch", () => {
  it("returns no offer when the search falls back to unrelated jobs", async () => {
    const ctx = fixtureContext([{ match: SEARCH, file: "hatch/search-empty.html" }]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.jobs).toEqual([]);
    expect(ctx.requests).toHaveLength(1);
  });

  it("parses a DRC offer", async () => {
    // Hatch had no DRC offer on 2026-11-14: search.html and the detail page
    // are real pages whose Saskatoon location was hand-edited to Lubumbashi.
    const ctx = fixtureContext([
      { match: SEARCH, file: "hatch/search.html" },
      { match: "/1431094900/", file: "hatch/job-1431094900.html" },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.rejected).toEqual([]);
    // The Mississauga row is filtered out.
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]).toMatchObject({
      externalId: "1431094900",
      title: "Senior Electrical Designer",
      company: "Hatch",
      url: "https://jobs.hatch.com/job/Saskatoon-Senior-Electrical-Designer-SK/1431094900/",
      location: "Lubumbashi, Haut-Katanga, CD",
      city: "Lubumbashi",
      publishedAt: "2026-11-14",
      closesAt: null,
    });
    expect(result.jobs[0].descriptionHtml).toBeTruthy();
  });
});
