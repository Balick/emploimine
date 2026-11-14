import { describe, expect, it } from "vitest";
import { runSource } from "../run";
import { fixtureContext } from "../testing";
import source from "./trafigura";

const API = "trafigura.wd3.myworkdayjobs.com/wday/cxs/trafigura/TrafiguraCareerSite";

describe("trafigura", () => {
  it("keeps only DRC offers and normalises them", async () => {
    // Real responses of 2026-11-14. The search was filtered on the DRC
    // country facet (1 result); the Lima offer was copied in from the
    // unfiltered search to check that the DRC filter is re-applied on the
    // detail, should the facet ever let foreign offers through.
    const ctx = fixtureContext([
      {
        match: `${API}/jobs`,
        when: (options) =>
          JSON.stringify(options?.json).includes(
            '"locationCountry":["db69c26c446c11de98360015c5e6daf6"]'
          ),
        file: "trafigura/jobs.json",
      },
      { match: `${API}/job/Lubumbashi-`, file: "trafigura/job-R-017679.json" },
      { match: `${API}/job/Lima-Peru/`, file: "trafigura/job-R-018902.json" },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.rejected).toEqual([]);
    expect(result.jobs.map((job) => job.title)).toEqual(["Logistics Operations Support"]);
    expect(result.jobs[0]).toMatchObject({
      externalId: "R-017679",
      company: "Trafigura",
      url: "https://trafigura.wd3.myworkdayjobs.com/TrafiguraCareerSite/job/Lubumbashi-Congo-Democratic-Republic-of-the/Logistics-Operations-Support_R-017679",
      // The location already names the country: the (translated) country
      // descriptor is not appended a second time.
      location: "Lubumbashi, Congo, Democratic Republic of the",
      city: "Lubumbashi",
      // "Temps Plein" is a working time, not a contract type.
      contractType: null,
      publishedAt: "2026-03-30",
      closesAt: null,
    });
    expect(result.jobs[0].descriptionHtml).toMatch(/^<p>This role is critical/);
  });
});
