/**
 * Orica: explosives and blasting services for mines, active on the
 * Copperbelt (DRC/Zambia).
 *
 * Endpoint: SAP SuccessFactors career site (table layout), country facet,
 *   https://careers.orica.com/search/?q=&optionsFacetsDD_country=CD
 * With no DRC offer the page says "There are currently no open positions
 * matching…" and lists the 10 latest global jobs instead: we return [].
 *
 * robots.txt: only /services/, /talentcommunity/, /applybutton/… are
 * disallowed; /search/ and /job/ are allowed.
 * Verified 2026-11-14 (152 offers on the site, 0 DRC offers today).
 */
import { successFactors } from "../adapters/successfactors";
import { defineSource } from "../types";

export default defineSource({
  id: "orica",
  name: "Orica",
  website: "https://careers.orica.com/search/?q=&optionsFacetsDD_country=CD",
  kind: "contractor",
  scrape: (ctx) =>
    successFactors(ctx, {
      origin: "https://careers.orica.com",
      searches: [{ optionsFacetsDD_country: "CD" }],
      company: "Orica",
    }),
});
