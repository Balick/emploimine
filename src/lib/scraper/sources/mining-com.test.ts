import { describe, expect, it } from "vitest";
import { runSource } from "../run";
import { fixtureContext } from "../testing";
import source from "./mining-com";

const LISTING = "https://www.mining.com/jobs/in-democratic-republic-of-the-congo";

describe("mining-com", () => {
  it("keeps DRC offers not covered by a direct source (hand-edited fixture)", async () => {
    const ctx = fixtureContext([
      { match: LISTING, file: "mining-com/listing.html" },
      { match: "www.mining.com/jobs/797623642-officer-erp-support", file: "mining-com/offer-797623642.html" },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.rejected).toEqual([]);
    // Ivanhoe Mines (employer name) and Hatch (jobs.hatch.com apply link) are
    // covered by direct sources; the Zambia offer is not in the DRC.
    expect(result.jobs.map((job) => job.externalId)).toEqual(["797623642"]);
    expect(result.jobs[0]).toMatchObject({
      externalId: "797623642",
      title: "Officer, ERP Support",
      company: "First Quantum",
      url: "https://www.mining.com/jobs/797623642-officer-erp-support",
      location: "Kolwezi, Lualaba, Democratic Republic of the Congo",
      city: "Kolwezi",
      // "Full-time" says nothing about the contract.
      contractType: null,
      publishedAt: "2026-11-06",
      closesAt: "2026-11-19",
    });
    expect(result.jobs[0].descriptionHtml).toMatch(/^<p>At First Quantum/);
    // Only the kept offer's page is fetched.
    expect(ctx.requests).toEqual([LISTING, "https://www.mining.com/jobs/797623642-officer-erp-support"]);
  });

  it("returns no offer when the country page is empty", async () => {
    const ctx = fixtureContext([{ match: LISTING, file: "mining-com/listing-empty.html" }]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.jobs).toEqual([]);
  });

  it("fails loudly when the embedded job list disappears", async () => {
    const ctx = fixtureContext([{ match: LISTING, body: "<html><body><p>Maintenance</p></body></html>" }]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/window\.jobsList/);
  });
});
