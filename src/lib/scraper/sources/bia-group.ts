/**
 * BIA: Komatsu dealer for Central and West Africa (sales, rental and
 * after-sales of mining equipment), with branches in Lubumbashi and Kolwezi.
 *
 * Endpoint: SAP SuccessFactors career site (tile layout),
 *   https://jobs.biagroup.com/search/?q=&locationsearch=DRC
 * BIA's postings have no ISO country (their DRC offers carry
 * `addressCountry: "DR"`), so the `optionsFacetsDD_country=CD` facet returns
 * nothing; their location field is just the country name ("DRC", "Zambia"…),
 * which the free-text location search matches exactly.
 *
 * robots.txt: only /services/, /talentcommunity/, /applybutton/… are
 * disallowed; /search/ and /job/ are allowed.
 * Verified 2026-11-14 (81 offers on the site, 7 DRC offers).
 */
import { successFactors } from "../adapters/successfactors";
import { defineSource } from "../types";

export default defineSource({
  id: "bia-group",
  name: "BIA (Komatsu)",
  website: "https://jobs.biagroup.com/search/?q=&locationsearch=DRC",
  kind: "contractor",
  scrape: (ctx) =>
    successFactors(ctx, {
      origin: "https://jobs.biagroup.com",
      searches: [{ locationsearch: "DRC" }],
      company: "BIA",
    }),
});
