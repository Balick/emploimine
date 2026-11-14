import { describe, expect, it } from "vitest";
import { runSource } from "../run";
import { fixtureContext } from "../testing";
import source from "./kamoa-copper";

const LIST = "kamoacoppersa.simplify.hr/vacancy/vacancies?query=&displayOrder=0";

describe("kamoa-copper", () => {
  it("returns no offer on the empty-state page (live response of 2026-11-14)", async () => {
    const ctx = fixtureContext([{ match: LIST, file: "kamoa-copper/vacancies-empty.html" }]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(result.jobs).toEqual([]);
    expect(ctx.requests).toHaveLength(1);
  });

  it("also accepts the shorter empty-state wording", async () => {
    const ctx = fixtureContext([{ match: LIST, body: "<div>There are currently no vacancies.</div>" }]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.ok).toBe(true);
    expect(result.jobs).toEqual([]);
  });

  it("keeps only DRC offers and normalises them (hand-edited fixtures)", async () => {
    const ctx = fixtureContext([
      { match: LIST, file: "kamoa-copper/vacancies.html" },
      { match: "kamoacoppersa.simplify.hr/Vacancy/301122", file: "kamoa-copper/vacancy-301122.html" },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.rejected).toEqual([]);
    // The Mokopane (South Africa) vacancy is filtered out.
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]).toMatchObject({
      externalId: "301122",
      title: "Senior Mining Engineer (Ref: KC-MIN-0412)",
      company: "Kamoa Copper",
      url: "https://kamoacoppersa.simplify.hr/Vacancy/301122",
      location: "Kamoa-Kakula, Kolwezi, Lualaba, Democratic Republic of Congo",
      city: "Kolwezi",
      contractType: "CDD",
      publishedAt: "2026-11-03",
      closesAt: "2026-11-17",
      level: "Mid-Senior level",
    });
    expect(result.jobs[0].descriptionHtml).toMatch(/^<p><strong>KAMOA COPPER SA/);
  });
});
