import { describe, expect, it } from "vitest";
import { runSource } from "../run";
import { fixtureContext } from "../testing";
import source from "./orica";

const SEARCH = "/search/?q=&optionsFacetsDD_country=CD";

describe("orica", () => {
  it("returns no offer when the search falls back to unrelated jobs", async () => {
    const ctx = fixtureContext([{ match: SEARCH, file: "orica/search-empty.html" }]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.jobs).toEqual([]);
    // The fallback jobs listed under "no open positions" are never fetched.
    expect(ctx.requests).toHaveLength(1);
  });

  it("parses a DRC offer", async () => {
    // Orica had no DRC offer on 2026-11-14: search.html and the detail page are
    // real pages whose Timika location was hand-edited to Kolwezi.
    const ctx = fixtureContext([
      { match: SEARCH, file: "orica/search.html" },
      { match: "/1410887600/", file: "orica/job-1410887600.html" },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.rejected).toEqual([]);
    // The New Zealand row is filtered out.
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]).toMatchObject({
      externalId: "1410887600",
      title: "Administrator - Field Site Support",
      company: "Orica",
      url: "https://careers.orica.com/job/Timika-Administrator-Field-Site-Support-IJ-99967/1410887600/",
      location: "Kolwezi, Lualaba, CD",
      city: "Kolwezi",
      publishedAt: "2026-11-14",
      closesAt: null,
    });
    expect(result.jobs[0].descriptionHtml).toBeTruthy();
  });
});
