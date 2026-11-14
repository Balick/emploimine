import { describe, expect, it } from "vitest";
import { runSource } from "../run";
import { fixtureContext } from "../testing";
import source, { isMiningOffer } from "./gladys-synergies";

describe("gladys-synergies", () => {
  it("follows pagination and keeps only mining offers located in the DRC", async () => {
    // Real responses trimmed to 6 offers over 2 pages: a mining offer in
    // Kolwezi, a bank offer in Kinshasa, an IT offer in France, a mining offer
    // without structured location, and a Lubumbashi mining offer advertised
    // from Paris plus its copy advertised from Brussels.
    const ctx = fixtureContext([
      { match: "gladys-synergies/jobs/?page_size=20", file: "gladys-synergies/jobs-page-1.json" },
      { match: "gladys-synergies/jobs/?page=2&page_size=20", file: "gladys-synergies/jobs-page-2.json" },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.rejected).toEqual([]);
    expect(ctx.requests).toHaveLength(2);
    expect(result.jobs.map((job) => job.externalId)).toEqual(["638X5RW5", "W35RV3Y6", "Y6R38YV9"]);
    expect(result.jobs[0]).toMatchObject({
      title: "Load and Haul Superintendent, Kolwezi, DRC – M/F",
      // The client is anonymous ("an international mining company").
      company: "Gladys Synergies",
      url: "https://www.careers-page.com/gladys-synergies/job/638X5RW5",
      location: "Kolwezi, Democratic Republic of the Congo",
      city: "Kolwezi",
      // "Contract Type: Permanent".
      contractType: "CDI",
      publishedAt: null,
    });
    // Location read from "Lieu de travail : Lubumbashi (RDC)".
    expect(result.jobs[1]).toMatchObject({
      location: "Lubumbashi (RDC)",
      city: "Lubumbashi",
      contractType: "CDI",
    });
    // Structured location "Paris, France", but "Lieu de travail : Lubumbashi
    // (RDC)": the job is in the DRC. Its Brussels copy (X9Y68X7R, "Job
    // Reference : Y6R38YV9") is skipped.
    expect(result.jobs[2]).toMatchObject({
      url: "https://www.careers-page.com/gladys-synergies/job/Y6R38YV9",
      location: "Lubumbashi (RDC)",
      city: "Lubumbashi",
    });
  });

  it("judges mining relevance on the title and the sector line only", () => {
    const offer = (title: string, ...lines: string[]) => isMiningOffer({ title, lines });
    expect(offer("Comptable (H/F)", "Secteur : Minier")).toBe(true);
    expect(offer("Géologue Senior - Kolwezi / RDC")).toBe(true);
    expect(offer("Parts Manager", "Sector: Distribution d'équipements industriels et miniers")).toBe(true);
    expect(offer("Project Manager IT (Banques)", "Secteur : Bancaire")).toBe(false);
    // Clients of a logistics firm include mines: not enough.
    expect(offer("Directeur Commercial", "Secteur : Logistique", "Clients du secteur minier")).toBe(false);
    // A town is not a sector.
    expect(offer("Consul honoraire à Kolwezi")).toBe(false);
    // Word boundaries: "détermine" is not "mine".
    expect(offer("Analyste qui détermine les prix")).toBe(false);
  });
});
