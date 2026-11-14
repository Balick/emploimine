/**
 * AGL - Africa Global Logistics (ex-Bolloré Africa Logistics): port, freight
 * forwarding and the mining logistics corridors of Haut-Katanga and Lualaba.
 * The DRC entity is "Africa Global Logistics RDC SA".
 *
 * Endpoint: Talent-soft RSS feed of the DRC offers
 *   https://acareerbyagl.talent-soft.com/handlers/offerRss.ashx?LCID=1033&Rss_JobCountry=60
 * plus each offer page (/Pages/Offre/detailoffre.aspx) for the location.
 * Country id checked against the site's "Job location" filter:
 * 60 = Democratic Republic of the Congo, 61 = Republic of the Congo (excluded).
 *
 * robots.txt: empty (HTTP 200, 0 bytes), nothing disallowed.
 * Verified 2026-11-14 (5 DRC offers: 3 Lubumbashi, 1 Kinshasa, 1 without city).
 */
import { talentsoft } from "../adapters/talentsoft";
import { defineSource } from "../types";

export default defineSource({
  id: "agl",
  name: "AGL - Africa Global Logistics",
  website: "https://acareerbyagl.talent-soft.com/offre-de-emploi/liste-offres.aspx",
  kind: "contractor",
  scrape: (ctx) =>
    talentsoft(ctx, {
      host: "acareerbyagl.talent-soft.com",
      countryId: 60,
      lcid: 1033,
      company: "AGL - Africa Global Logistics",
    }),
});
