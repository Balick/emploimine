/**
 * Metso: mining equipment, crushing/grinding and minerals processing
 * services, with a service centre in Lubumbashi.
 *
 * Endpoint: SAP SuccessFactors career site (table layout), country facet,
 *   https://careers.metso.com/search/?q=&optionsFacetsDD_country=CD
 * Many Metso offers list several locations ("Espoo, FI +3 more…"); those
 * are checked on their detail page. With no DRC offer the page says "There
 * are currently no open positions matching…": we return [].
 *
 * robots.txt: only /services/, /talentcommunity/, /applybutton/… are
 * disallowed; /search/ and /job/ are allowed.
 * Verified 2026-11-14 (152 offers on the site, 0 DRC offers today).
 */
import { successFactors } from "../adapters/successfactors";
import { defineSource } from "../types";

export default defineSource({
  id: "metso",
  name: "Metso",
  website: "https://careers.metso.com/search/?q=&optionsFacetsDD_country=CD",
  kind: "contractor",
  scrape: (ctx) =>
    successFactors(ctx, {
      origin: "https://careers.metso.com",
      searches: [{ optionsFacetsDD_country: "CD" }],
      company: "Metso",
    }),
});
