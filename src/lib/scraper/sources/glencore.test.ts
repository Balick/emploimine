import { describe, expect, it } from "vitest";
import { runSource } from "../run";
import { fixtureContext } from "../testing";
import source from "./glencore";
import enPage from "./__fixtures__/glencore/jobs-en.json";

const API = "www.glencore.com/.rest/api/v2/careers/";

describe("glencore", () => {
  it("keeps only DRC offers, prefers the French copy and normalises them", async () => {
    const ctx = fixtureContext([
      { match: `${API}?locale=fr&`, file: "glencore/jobs-fr.json" },
      { match: `${API}?locale=en&`, file: "glencore/jobs-en.json" },
      { match: "careers.glencorecopper.com/job/Kolwezi-Conseiller-Technique-Exploitation-Mini%C3%A8re-Souterraine-7110501/1374920155/", file: "glencore/offer-2250-fr.html" },
      { match: "careers.glencorecopper.com/job/Kolwezi-Sp%C3%A9cialiste-en-P%C3%A9diatrie/1376754855/", file: "glencore/offer-2356-fr.html" },
      { match: "careers.glencorecopper.com/job/Kolwezi-Process-Engineer-7110501/1372959155/", file: "glencore/offer-2298-en.html" },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.rejected).toEqual([]);
    // Canada (no country, location in `locationTitle`), Australia and South
    // Africa are filtered out; requisition 2250 is published in both
    // languages and kept once, in French; 2298 only exists in English here.
    expect(result.jobs.map((job) => job.externalId)).toEqual([
      "SF FEED:2250",
      "SF FEED:2356",
      "SF FEED:2298",
    ]);
    expect(result.jobs[0]).toMatchObject({
      title: "Conseiller Technique - Exploitation Minière Souterraine",
      company: "Kamoto Copper Company",
      // HTTPS, without the utm_source tracking parameter.
      url: "https://careers.glencorecopper.com/job/Kolwezi-Conseiller-Technique-Exploitation-Mini%C3%A8re-Souterraine-7110501/1374920155/?feedId=418355",
      location: "Kolwezi, Democratic Republic of the Congo",
      city: "Kolwezi",
      // "Job Type: Fixed Term" on the offer page.
      contractType: "CDD",
      // 2026-10-28T23:00Z is Oct 29 in Zurich, as shown on the offer page.
      publishedAt: "2026-10-29",
      // Unpublished at 2026-11-28T23:00Z (Zurich midnight): last day is Nov 28.
      closesAt: "2026-11-28",
      vacancies: null,
      level: null,
    });
    expect(result.jobs[0].descriptionHtml).toContain("Kamoto Copper Company");
    expect(result.jobs[0].descriptionHtml).not.toContain("style=");

    // Explicit "Nombre de poste(s)" / "Niveau du poste" lines in the description.
    expect(result.jobs[1]).toMatchObject({
      title: "Spécialiste en Pédiatrie",
      contractType: "CDI",
      publishedAt: "2026-11-12",
      // Matches "Application Deadline: 11 December 2026" in the description.
      closesAt: "2026-12-11",
      vacancies: 1,
      level: "Cadre de Direction",
    });
    expect(result.jobs[2]).toMatchObject({
      title: "Process Engineer",
      url: "https://careers.glencorecopper.com/job/Kolwezi-Process-Engineer-7110501/1372959155/?feedId=418355",
      publishedAt: "2026-10-15",
      closesAt: "2026-11-14",
    });
    for (const job of result.jobs) {
      expect(job.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(job.closesAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("paginates with the total of the first page and maps Mutanda", async () => {
    const [nonDrc, , , kcc] = enPage.data;
    // Hand-made pages: the API reports `totalResults` on the first page only.
    const firstPage = {
      totalResults: 401,
      data: Array.from({ length: 400 }, (_, i) => ({ ...nonDrc, id: i, jobId: `X${i}` })),
    };
    // Real KCC item re-labelled as a Mutanda Mining offer.
    const mutanda = { ...kcc, jobId: "9001", commodity: "MUMI" };
    const ctx = fixtureContext([
      { match: `${API}?locale=fr&`, body: { totalResults: 0, data: [] } },
      { match: /locale=en&.*offset=0&/, body: firstPage },
      { match: /locale=en&.*offset=400&/, body: { totalResults: 0, data: [mutanda] } },
      { match: "careers.glencorecopper.com/job/", file: "glencore/offer-2298-en.html" },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]).toMatchObject({ externalId: "SF FEED:9001", company: "Mutanda Mining" });
    expect(ctx.requests.filter((url) => url.includes(API))).toHaveLength(3);
  });

  it("throws when the response structure changes", async () => {
    const ctx = fixtureContext([{ match: API, body: { results: [] } }]);
    const result = await runSource(source, { http: ctx.http, log: () => {} });
    expect(result.error).toMatch(/Unexpected Glencore careers response/);
  });
});
