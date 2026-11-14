import { describe, expect, it } from "vitest";
import { runSource } from "../run";
import { fixtureContext } from "../testing";
import source from "./agl";

const FEED = "acareerbyagl.talent-soft.com/handlers/offerRss.ashx?LCID=1033&Rss_JobCountry=60";

/** What Talent-soft serves for an offer that was delisted after the feed was built. */
const HOME_PAGE = "<!DOCTYPE html><html><body><div id=\"contenu2\">Accueil</div></body></html>";

describe("agl", () => {
  it("keeps only DRC offers and normalises them", async () => {
    const ctx = fixtureContext([
      { match: FEED, file: "agl/feed.xml" },
      { match: "idOffre=10338&", file: "agl/offer-10338.html" },
      { match: "idOffre=9664&", file: "agl/offer-9664.html" },
      // Hand-edited to Pointe-Noire (Republic of the Congo): must be dropped.
      { match: "idOffre=9458&", file: "agl/offer-9458.html" },
      { match: "idOffre=9372&", body: HOME_PAGE },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.rejected).toEqual([]);
    expect(result.jobs.map((job) => job.externalId)).toEqual(["10338", "9664"]);

    expect(result.jobs[0]).toMatchObject({
      externalId: "10338",
      // The "2026-10338 - " reference prefix is removed.
      title: "Director - Strategic Projects and Infrastructure H/F",
      company: "AGL - Africa Global Logistics",
      url: "https://acareerbyagl.talent-soft.com/Pages/Offre/detailoffre.aspx?idOffre=10338&idOrigine=2442&LCID=1033&offerReference=2026-10338",
      location: "KINSHASA, Democratic Republic of the Congo",
      city: "Kinshasa",
      contractType: "CDI",
      publishedAt: "2026-10-22",
    });
    expect(result.jobs[0].descriptionHtml).toMatch(/^<h3>Mission Description<\/h3><p>Reporting directly/);
    expect(result.jobs[0].descriptionHtml).toContain("<h3>Profile</h3>");

    // The page has no city, only the country: the city comes from the title.
    expect(result.jobs[1]).toMatchObject({
      location: "République Démocratique du Congo",
      city: "Lubumbashi",
      publishedAt: "2026-03-26",
    });
  });

  it("fails loudly when no offer page can be read (template changed)", async () => {
    const ctx = fixtureContext([
      { match: FEED, file: "agl/feed.xml" },
      { match: "detailoffre.aspx", body: HOME_PAGE },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Aucune fiche d'offre lisible/);
  });

  it("fails loudly when the country id no longer points to the DRC", async () => {
    const ctx = fixtureContext([
      {
        match: FEED,
        // Real channel title of Rss_JobCountry=61 on this tenant.
        body: `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>RSS export of job openings  - Seulement les offres à la une : No / Pays : Afrique--&gt;République du Congo</title></channel></rss>`,
      },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/ne pointe pas vers la RDC/);
  });
});
