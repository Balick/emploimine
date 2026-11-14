import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runSource } from "../run";
import { fixtureContext } from "../testing";
import source, { contractTypeFromTitle, isMiningOffer, isNotice } from "./mediacongo";

/** Search pages and offer pages, by URL fragment. */
const ROUTES = [
  // Real "mine" results (2 Kibali offers) + hand-edited rows: expired, Zambia, noise.
  { match: "emplois-search-mine-tri-offres_recentes-page-1.html", file: "mediacongo/search-mine.html" },
  // Hand-edited: one mining offer with a text description + a duplicate of 45045.
  { match: "emplois-search-minier-tri-offres_recentes-page-1.html", file: "mediacongo/search-minier.html" },
  // Real "no result" page, served for the other keywords.
  { match: /emplois-search-(mining|copper|cobalt)-tri-offres_recentes-page-1\.html/, file: "mediacongo/search-empty.html" },
  { match: "emploi-societe-45045_", file: "mediacongo/offer-45045.html" },
  { match: "emploi-societe-45044_", file: "mediacongo/offer-45044.html" },
  { match: "emploi-societe-45084_", file: "mediacongo/offer-45084.html" },
  { match: "emploi-societe-45090_", file: "mediacongo/offer-45090.html" },
];

describe("mediacongo", () => {
  beforeEach(() => {
    // The deadline filter compares with today: freeze the date of the fixtures.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-10T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps only current mining offers located in the DRC", async () => {
    const ctx = fixtureContext(ROUTES);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.rejected).toEqual([]);
    // Expired (45070), Zambian (45071) and notice (45072) rows are dropped
    // from the listing, the "durée déterminée" noise (45084) by the mining filter.
    expect(result.jobs.map((job) => job.externalId)).toEqual(["45090", "45045", "45044"]);
    expect(ctx.requests.some((url) => /4507[012]_/.test(url))).toBe(false);
    expect(ctx.requests.some((url) => url.includes("45084_"))).toBe(true);
    // 45045 is found by two keywords but its page is read once.
    expect(ctx.requests.filter((url) => url.includes("45045_"))).toHaveLength(1);

    const kibali = result.jobs.find((job) => job.externalId === "45045");
    expect(kibali).toMatchObject({
      title: "Foreman - Mobile Fleet Maintenance",
      company: "KIBALI GOLDMINE SA",
      url: "https://www.mediacongo.net/emploi-societe-45045_kibali_goldmine_sa_foreman_mobile_fleet_maintenance.html",
      location: "Durba (Haut-Uélé)",
      city: "Durba",
      contractType: null,
      publishedAt: "2026-10-26",
      closesAt: null,
    });
    // Image-only ad: the scans are kept as links.
    expect(kibali?.descriptionHtml).toContain(
      '<a href="https://www.mediacongo.net/dpics/filesmanager/jobaof/2026/10-octobre/05/kibali_261026_02_01.jpg"'
    );
    expect(kibali?.descriptionHtml).toContain("Voir l'annonce (image 4)");

    expect(result.jobs[0]).toMatchObject({
      title: "Géologue minier (CDD)",
      company: "SOCIETE MINIERE EXEMPLE SA",
      city: "Lubumbashi",
      contractType: "CDD",
      publishedAt: "2026-11-10",
      // "au plus tard le 30/11/2026"
      closesAt: "2026-11-30",
    });
    expect(result.jobs[0].descriptionHtml).toContain("<strong>CONTEXTE</strong>");
    expect(result.jobs[0].descriptionHtml).not.toContain("\\r\\n");
    // Relative image paths are resolved against the offer page.
    expect(result.jobs[0].descriptionHtml).toContain('href="https://www.mediacongo.net/dpics/');
  });

  it("drops offers whose stated deadline has passed", async () => {
    vi.setSystemTime(new Date("2026-12-01T12:00:00Z"));
    const ctx = fixtureContext(ROUTES);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.jobs.map((job) => job.externalId)).toEqual(["45045", "45044"]);
  });

  it("returns nothing when no keyword has results", async () => {
    const ctx = fixtureContext([{ match: "emplois-search-", file: "mediacongo/search-empty.html" }]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.jobs).toEqual([]);
  });

  it("fails loudly when the results table is missing", async () => {
    const ctx = fixtureContext([{ match: "emplois-search-", body: "<html><body><p>Maintenance</p></body></html>" }]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Tableau des offres introuvable/);
  });
});

describe("isMiningOffer", () => {
  it("matches mining words but not search noise or demining", () => {
    expect(isMiningOffer("Electrician", "KIBALI GOLDMINE SA")).toBe(true);
    expect(isMiningOffer("Ingénieur des Mines", "GECAMINES")).toBe(true);
    expect(isMiningOffer("Comptable", "Entreprise X", "secteur minier au Lualaba")).toBe(true);
    expect(isMiningOffer("Assistant (contrat à durée déterminée)", "ONG Y")).toBe(false);
    expect(isMiningOffer("Chef d'équipe déminage", "Mines Advisory Group")).toBe(false);
  });
});

describe("isNotice", () => {
  it("recognises recruitment notices listed as rows", () => {
    // Real title seen on emplois.html on 2026-11-14.
    expect(isNotice("Liste de candidats retenus : Spécialiste en Passation des Marchés")).toBe(true);
    expect(isNotice("Communiqué : report de la date limite")).toBe(true);
    expect(isNotice("Chargé de communication")).toBe(false);
    expect(isNotice("Foreman - Mobile Fleet Maintenance")).toBe(false);
  });
});

describe("contractTypeFromTitle", () => {
  it("reads only explicit contract words, never job names", () => {
    expect(contractTypeFromTitle("Géologue minier (CDD)")).toBe("CDD");
    expect(contractTypeFromTitle("Stagiaire en géologie")).toBe("Stage");
    expect(contractTypeFromTitle("Consultant international en environnement")).toBe("Consultance");
    expect(contractTypeFromTitle("Contract Manager")).toBeNull();
    expect(contractTypeFromTitle("Auditeur interne")).toBeNull();
    expect(contractTypeFromTitle("Graduate Trainee - Processing")).toBeNull();
  });
});
