import { describe, expect, it } from "vitest";
import { runSource } from "../run";
import { fixtureContext } from "../testing";
import source from "./kilele";

describe("kilele", () => {
  it("keeps only DRC offers and normalises them", async () => {
    // Real response trimmed to 3 offers; the 4th ("BRAZZA01") is a hand-edited
    // copy located in Brazzaville, since the live board is DRC-only.
    const ctx = fixtureContext([
      { match: "careers-page.com/api/v1.0/c/kileledrc/jobs/?page_size=20", file: "kilele/jobs.json" },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.rejected).toEqual([]);
    expect(result.jobs.map((job) => job.externalId)).toEqual(["3W6Y7758", "3W73X748", "5W79X4V3"]);
    expect(result.jobs[0]).toMatchObject({
      title: "Condition Monitoring Technician / Technicien Monitoring Conditionnel",
      company: "Kilele DRC",
      url: "https://www.careers-page.com/kileledrc/job/3W6Y7758",
      // Manatal calls the DRC "Republic of the Congo"; the location is fixed.
      location: "Kolwezi, Democratic Republic of the Congo",
      city: "Kolwezi",
      // "Contrat de 24 mois" is not understood, "24-month Contract" is.
      contractType: "CDD",
      // The API exposes no dates.
      publishedAt: null,
      closesAt: null,
    });
    expect(result.jobs[0].descriptionHtml).toContain("Technicien Monitoring Conditionnel");
    // No structured location: the "Lieu :" line of the description is used,
    // and the Kamoto mine maps to the nearest town.
    expect(result.jobs[1]).toMatchObject({
      location: "Kamoto, RDC – Exploitation minière souterraine",
      city: "Kolwezi",
    });
    // "Company: KILELE SARL" is the recruiter itself, not an end employer.
    expect(result.jobs[2]).toMatchObject({ company: "Kilele DRC", contractType: null });
  });

  it("returns [] for a board without open positions", async () => {
    const ctx = fixtureContext([
      { match: "kileledrc/jobs/", body: { count: 0, next: null, previous: null, results: [] } },
    ]);
    expect(await source.scrape(ctx)).toEqual([]);
  });

  it("throws on an unexpected response", async () => {
    const ctx = fixtureContext([{ match: "kileledrc/jobs/", body: { detail: "Not found." } }]);
    await expect(source.scrape(ctx)).rejects.toThrow(/results/);
  });
});
