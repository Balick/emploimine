import { describe, expect, it } from "vitest";
import { runSource } from "../run";
import { fixtureContext } from "../testing";
import source from "./cis";

const FEED = "cis-career.talent-soft.com/handlers/offerRss.ashx?LCID=1036&Rss_JobCountry=158";

describe("cis", () => {
  it("parses a DRC offer (hand-edited fixture, no live DRC offer on 2026-11-14)", async () => {
    const ctx = fixtureContext([
      { match: FEED, file: "cis/feed.xml" },
      // The feed links to the tenant's custom domain.
      { match: "career.cis-integratedservices.com/Pages/Offre/detailoffre.aspx?idOffre=1290&", file: "cis/offer-1290.html" },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.rejected).toEqual([]);
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]).toMatchObject({
      externalId: "1290",
      title: "RAF - Responsable Administratif et Financier Pays",
      company: "CIS - Catering International & Services",
      url: "https://career.cis-integratedservices.com/Pages/Offre/detailoffre.aspx?idOffre=1290&idOrigine=502&LCID=1036&offerReference=2026-1290",
      // "Rép démocratique du Congo" is expanded so that isInDrc recognises it.
      location: "KOLWEZI, République démocratique du Congo",
      city: "Kolwezi",
      contractType: "CDI",
      publishedAt: "2026-10-22",
    });
    // Rich-text fields keep their own paragraphs and lists.
    expect(result.jobs[0].descriptionHtml).toMatch(/^<h3>Description de la mission<\/h3><div><p>/);
    expect(result.jobs[0].descriptionHtml).toContain("<h3>Profil</h3>");
    expect(result.jobs[0].descriptionHtml).toContain("<li>");
  });

  it("returns no offer when the DRC feed is empty", async () => {
    const ctx = fixtureContext([{ match: FEED, file: "cis/feed-empty.xml" }]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.jobs).toEqual([]);
    // No offer page is requested.
    expect(ctx.requests).toHaveLength(1);
  });
});
