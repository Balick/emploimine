import { describe, expect, it } from "vitest";
import { runSource } from "../run";
import { fixtureContext } from "../testing";
import source from "./kobold-metals";

describe("kobold-metals", () => {
  it("keeps only DRC offers and normalises them", async () => {
    const ctx = fixtureContext([
      { match: "boards-api.greenhouse.io/v1/boards/koboldmetalsdrc/jobs", file: "kobold-metals/jobs.json" },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.rejected).toEqual([]);
    // The "Remote" Data Scientist offer is filtered out.
    expect(result.jobs.map((job) => job.title)).toEqual(["Drilling Superintendent", "HR Lead, DRC"]);
    expect(result.jobs[0]).toMatchObject({
      externalId: "4743174005",
      company: "KoBold Metals",
      url: "https://job-boards.greenhouse.io/koboldmetalsdrc/jobs/4743174005",
      city: "Manono",
      publishedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
    // Entity-encoded HTML is decoded, then sanitized.
    expect(result.jobs[0].descriptionHtml).toMatch(/^<p><strong>Drilling Superintendent/);
    expect(result.jobs[0].descriptionHtml).not.toContain("&lt;");
    expect(result.jobs[1].city).toBe("Lubumbashi");
  });
});
