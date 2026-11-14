import { describe, expect, it } from "vitest";
import { runSource } from "../run";
import { fixtureContext } from "../testing";
import source from "./epiroc";

describe("epiroc", () => {
  it("merges the CD facet and the city searches, keeping only DRC offers", async () => {
    // search.html: the real CD facet page (1 row) plus a Chennai row added to
    // check the location safety net. search-kolwezi.html is real and lists the
    // same Kolwezi offer again plus a multi-location offer missing from the
    // facet. search-lubumbashi.html is the real "no open positions" page.
    const ctx = fixtureContext([
      { match: "/search/?q=&optionsFacetsDD_country=CD", file: "epiroc/search.html" },
      { match: "/search/?q=&locationsearch=Kolwezi", file: "epiroc/search-kolwezi.html" },
      { match: "/search/?q=&locationsearch=Lubumbashi", file: "epiroc/search-lubumbashi.html" },
      { match: "/1384619633/", file: "epiroc/job-1384619633.html" },
      { match: "/1457167833/", file: "epiroc/job-1457167833.html" },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.rejected).toEqual([]);
    expect(result.jobs.map((job) => job.externalId)).toEqual(["1384619633", "1457167833"]);
    // Chennai (facet fixture) and the Lubumbashi fallback row are never fetched,
    // and the Kolwezi offer found by two searches is fetched once.
    expect(ctx.requests.some((url) => url.includes("1424570333"))).toBe(false);
    expect(ctx.requests.filter((url) => url.includes("/1384619633/"))).toHaveLength(1);

    expect(result.jobs[0]).toMatchObject({
      externalId: "1384619633",
      title: "Business Line Manager - Tools and Attachments",
      company: "Epiroc",
      url: "https://www.careerprofile.epiroc.com/job/Kolwezi-Business-Line-Manager-Tools-and-Attachments-Lual/1384619633/",
      location: "Kolwezi, Lualaba, CD",
      city: "Kolwezi",
      contractType: null,
      // schema.org microdata: "Fri Nov 13 02:00:00 UTC 2026" / "Fri Nov 20 22:00:00 UTC 2026".
      publishedAt: "2026-11-13",
      closesAt: "2026-11-20",
    });
    expect(result.jobs[0].descriptionHtml).toContain("Business Line Manager");

    // "Örebro, … +5 more…" in the list: the DRC location comes from the
    // detail page (its country is mis-coded "SE" by Epiroc).
    expect(result.jobs[1]).toMatchObject({
      title: "Vice President Controlling & Finance Parts and Services - EMEA",
      location: "Kolwezi, Lualaba, SE",
      city: "Kolwezi",
      publishedAt: "2026-11-13",
      closesAt: "2026-11-27",
    });
  });
});
