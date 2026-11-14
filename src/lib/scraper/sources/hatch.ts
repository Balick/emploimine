/**
 * Hatch: engineering and project management firm for mining and metals
 * projects (EPCM), occasionally hiring for DRC copper/cobalt projects.
 *
 * Endpoint: SAP SuccessFactors career site (table layout), country facet,
 *   https://jobs.hatch.com/search/?q=&optionsFacetsDD_country=CD
 * With no DRC offer the page says "There are currently no open positions
 * matching…" and lists the 10 latest global jobs instead: we return [].
 *
 * robots.txt: only /services/, /talentcommunity/, /applybutton/… are
 * disallowed; /search/ and /job/ are allowed.
 * Verified 2026-11-14 (725 offers on the site, 0 DRC offers today).
 */
import { successFactors } from "../adapters/successfactors";
import { defineSource } from "../types";

export default defineSource({
  id: "hatch",
  name: "Hatch",
  website: "https://jobs.hatch.com/search/?q=&optionsFacetsDD_country=CD",
  kind: "contractor",
  scrape: (ctx) =>
    successFactors(ctx, {
      origin: "https://jobs.hatch.com",
      searches: [{ optionsFacetsDD_country: "CD" }],
      company: "Hatch",
    }),
});
