import { describe, expect, it } from "vitest";
import { runSource } from "../run";
import { fixtureContext } from "../testing";
import source from "./ivanhoe-mines";

const LIST = "ivanhoemines.simplify.hr/vacancy/vacancies?query=&displayOrder=0";

describe("ivanhoe-mines", () => {
  it("keeps only DRC offers, reads their detail page and normalises them", async () => {
    const ctx = fixtureContext([
      { match: LIST, file: "ivanhoe-mines/vacancies.html" },
      { match: "ivanhoemines.simplify.hr/Vacancy/210399", file: "ivanhoe-mines/vacancy-210399.html" },
      // Hand-edited Kipushi vacancy (see the comment in the fixture).
      { match: "ivanhoemines.simplify.hr/Vacancy/209999", file: "ivanhoe-mines/vacancy-209999.html" },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.rejected).toEqual([]);
    // The two Mokopane (South Africa) vacancies are filtered out before any
    // detail page is requested.
    expect(result.jobs.map((job) => job.title)).toEqual(["Accounting Assistant", "Plant Metallurgist"]);
    expect(ctx.requests.filter((url) => url.includes("/Vacancy/"))).toHaveLength(2);

    expect(result.jobs[0]).toMatchObject({
      externalId: "210399",
      company: "Ivanhoe Mines",
      url: "https://ivanhoemines.simplify.hr/Vacancy/210399",
      location: "Lubumbashi, Democratic Republic of Congo",
      city: "Lubumbashi",
      contractType: "CDI",
      publishedAt: "2026-11-03",
      closesAt: "2026-11-17",
      level: "Associate",
    });
    expect(result.jobs[0].descriptionHtml).toMatch(/^<p><strong>IVANHOE MINES DRC SARL/);
    expect(result.jobs[0].descriptionHtml).toContain("<li>Diploma or 3-year qualification");

    // Division "Kipushi Corporation (KICO)" credits the subsidiary.
    expect(result.jobs[1]).toMatchObject({
      externalId: "209999",
      company: "Kipushi Corporation",
      city: "Kipushi",
      contractType: "CDD",
      publishedAt: "2026-11-10",
      closesAt: "2026-11-24",
    });
  });

  it("throws when the list structure changes", async () => {
    const ctx = fixtureContext([{ match: LIST, body: "<div class=\"vacancies\"><p>New layout</p></div>" }]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/\.job-section/);
  });
});
