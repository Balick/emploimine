import { describe, expect, it } from "vitest";
import { runSource } from "../run";
import { fixtureContext } from "../testing";
import source from "./sgs";

const LIST = "careers.smartrecruiters.com/SGS?search=Congo";

describe("sgs", () => {
  it("reads the DRC location groups, then each offer page", async () => {
    const ctx = fixtureContext([
      { match: LIST, file: "sgs/list.html" },
      { match: "jobs.smartrecruiters.com/SGS/744000125305285", file: "sgs/744000125305285.html" },
      { match: "jobs.smartrecruiters.com/SGS/744000125301003", file: "sgs/744000125301003.html" },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.rejected).toEqual([]);
    // The hand-edited "Pointe-Noire, Congo" group (Brazzaville side) is never opened.
    expect(ctx.requests.some((url) => url.includes("744000999999999"))).toBe(false);
    expect(result.jobs.map((job) => job.externalId)).toEqual(["744000125305285", "744000125301003"]);
    expect(result.jobs[0]).toMatchObject({
      title: "Quality Manager",
      company: "SGS",
      url: "https://jobs.smartrecruiters.com/SGS/744000125305285",
      // "Kolwazi, Kolwazi, …" is deduplicated; the misspelt city maps to Kolwezi.
      location: "Kolwazi, Democratic Republic of the Congo",
      city: "Kolwezi",
      publishedAt: "2026-05-08",
      // "Full-time" says nothing about the contract.
      contractType: null,
    });
    expect(result.jobs[0].descriptionHtml).toContain("Company Description");
    // "Contract" is a fixed-term contract.
    expect(result.jobs[1].contractType).toBe("CDD");
  });

  it("completes a truncated location group through the « more » fragment", async () => {
    // Shapes copied from the live pages (a group shows at most 9 offers):
    // here 2 of 3 are visible, and the fragment's page 0 lists the third.
    const link = (id: string) =>
      `<li><a href="https://jobs.smartrecruiters.com/SGS/${id}-x" class="link--block details js-job-ad-link">x</a></li>`;
    const list =
      '<div class="js-openings"><section data-qty="3" class="js-group">' +
      '<h3 class="opening-title">Kolwazi, Democratic Republic of the Congo</h3>' +
      `<ul>${link("744000125305285")}${link("744000125301003")}</ul>` +
      '<a data-page="0" data-value="Kolwazi%2C%20CD" data-type="location" data-more="/SGS/api/more" class="js-more">More</a>' +
      "</section></div>";
    const ctx = fixtureContext([
      { match: LIST, body: list },
      {
        match: "careers.smartrecruiters.com/SGS/api/more?page=0&type=location&value=Kolwazi%2C%20CD",
        body: link("744000125305549") + link("744000125305285") + link("744000125301003"),
      },
      { match: "jobs.smartrecruiters.com/SGS/744000125305285", file: "sgs/744000125305285.html" },
      { match: "jobs.smartrecruiters.com/SGS/744000125301003", file: "sgs/744000125301003.html" },
      { match: "jobs.smartrecruiters.com/SGS/744000125305549", file: "sgs/744000125305285.html" },
    ]);

    const jobs = await source.scrape(ctx);

    expect(jobs.map((job) => job.externalId)).toEqual([
      "744000125305285",
      "744000125301003",
      "744000125305549",
    ]);
    // All 3 offers known after page 0: no further fragment is requested.
    expect(ctx.requests.filter((url) => url.includes("/api/more"))).toHaveLength(1);
  });

  it("returns [] when the search finds nothing", async () => {
    const ctx = fixtureContext([
      { match: LIST, body: '<html><body><div id="st-noOpeningsFound">No jobs found</div></body></html>' },
    ]);
    expect(await source.scrape(ctx)).toEqual([]);
  });

  it("throws when the openings list is missing", async () => {
    const ctx = fixtureContext([{ match: LIST, body: "<html><body>Maintenance</body></html>" }]);
    await expect(source.scrape(ctx)).rejects.toThrow(/introuvable/);
  });
});
