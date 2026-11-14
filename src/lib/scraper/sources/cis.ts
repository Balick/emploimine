/**
 * CIS - Catering International & Services: catering, facility management and
 * life-base services for remote mine camps, present in the DRC.
 *
 * Endpoint: Talent-soft RSS feed of the DRC offers
 *   https://cis-career.talent-soft.com/handlers/offerRss.ashx?LCID=1036&Rss_JobCountry=158
 * plus each offer page for the location. The feed links to the tenant's
 * custom domain (career.cis-integratedservices.com), same Talent-soft pages.
 * Country id: this tenant has its own referential, 158 = "Rép démocratique du
 * Congo" (as echoed by the feed title; 60 is Colombia here). The site's filter
 * only lists countries that currently have offers, so the DRC is absent today.
 *
 * robots.txt: empty (HTTP 200, 0 bytes) on both cis-career.talent-soft.com
 * and career.cis-integratedservices.com, nothing disallowed.
 * Verified 2026-11-14 (0 DRC offers; 3 offers site-wide, Côte d'Ivoire/France).
 */
import { talentsoft } from "../adapters/talentsoft";
import { defineSource } from "../types";

export default defineSource({
  id: "cis",
  name: "CIS - Catering International & Services",
  website: "https://career.cis-integratedservices.com/offre-de-emploi/liste-offres.aspx",
  kind: "contractor",
  scrape: (ctx) =>
    talentsoft(ctx, {
      host: "cis-career.talent-soft.com",
      countryId: 158,
      company: "CIS - Catering International & Services",
    }),
});
