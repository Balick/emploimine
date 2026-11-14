/**
 * Epiroc: mining and drilling equipment maker (Atlas Copco spin-off), with a
 * customer centre in Lubumbashi and service teams on the Copperbelt.
 *
 * Endpoint: SAP SuccessFactors career site (table layout), country facet,
 *   https://www.careerprofile.epiroc.com/search/?q=&optionsFacetsDD_country=CD
 * plus free-text location searches for Kolwezi and Lubumbashi: the facet
 * misses multi-location offers whose DRC location is a secondary one or has
 * a wrong country code (e.g. a regional VP role listed in Örebro, Chingola,
 * Johannesburg… and "Kolwezi, Lualaba, SE"). Each match is confirmed on its
 * detail page by the adapter.
 *
 * robots.txt: only /services/, /talentcommunity/, /applybutton/… are
 * disallowed; /search/ and /job/ are allowed.
 * Verified 2026-11-14 (325 offers on the site, 2 DRC offers: 1 in Kolwezi via
 * the facet, 1 multi-location offer that includes Kolwezi).
 */
import { successFactors } from "../adapters/successfactors";
import { defineSource } from "../types";

export default defineSource({
  id: "epiroc",
  name: "Epiroc",
  website: "https://www.careerprofile.epiroc.com/search/?q=&optionsFacetsDD_country=CD",
  kind: "contractor",
  scrape: (ctx) =>
    successFactors(ctx, {
      origin: "https://www.careerprofile.epiroc.com",
      searches: [
        { optionsFacetsDD_country: "CD" },
        { locationsearch: "Kolwezi" },
        { locationsearch: "Lubumbashi" },
      ],
      company: "Epiroc",
    }),
});
