import { describe, expect, it } from "vitest";
import { runSource } from "../run";
import { fixtureContext } from "../testing";
import source from "./metso";

const SEARCH = "/search/?q=&optionsFacetsDD_country=CD";

describe("metso", () => {
  it("returns no offer on the 'no open positions' page", async () => {
    const ctx = fixtureContext([{ match: SEARCH, file: "metso/search-empty.html" }]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.jobs).toEqual([]);
    expect(ctx.requests).toHaveLength(1);
  });

  it("pages through the table and checks multi-location offers on their detail page", async () => {
    // Metso had no DRC offer on 2026-11-14. The fixtures are real pages:
    // the pagination label was edited to split 3 rows over 2 pages, and one
    // location of the "Espoo, FI +8 more…" offer was changed to Lubumbashi.
    const ctx = fixtureContext([
      { match: `${SEARCH}&startrow=2`, file: "metso/search-page2.html" },
      { match: SEARCH, file: "metso/search.html" },
      { match: "/1374843857/", file: "metso/job-1374843857.html" },
      { match: "/1375031957/", file: "metso/job-1375031957.html" },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.rejected).toEqual([]);
    // Quzhou (single location) is dropped from the list; Sorocaba "+1 more" is
    // dropped after its detail page shows Brazilian locations only.
    expect(ctx.requests.some((url) => url.includes("1375038957"))).toBe(false);
    expect(ctx.requests.some((url) => url.includes("1375031957"))).toBe(true);
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]).toMatchObject({
      externalId: "1374843857",
      title: "Lead Data Product Engineer",
      company: "Metso",
      url: "https://careers.metso.com/job/Espoo-Lead-Data-Product-Engineer/1374843857/",
      // The DRC location is shown rather than the primary one (Espoo).
      location: "Lubumbashi, Haut-Katanga, CD",
      city: "Lubumbashi",
      publishedAt: "2026-11-12",
      closesAt: "2026-11-15",
    });
    expect(result.jobs[0].descriptionHtml).toBeTruthy();
  });
});
