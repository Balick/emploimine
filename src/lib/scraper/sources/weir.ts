/**
 * Weir Minerals: slurry pumps, crushers and mill liners for mines (ESCO
 * ground engaging tools), with service teams on the Copperbelt.
 *
 * Endpoint: Workday CXS API, tenant "weir" (wd3), site
 * "Weir_External_Careers", country facet "Country".
 * robots.txt: `/Weir_External_Careers/` allowed, `/wday/cxs/` not restricted
 * (only `/refreshFacet/` is disallowed). Verified 2026-11-14 (0 DRC offer,
 * 244 worldwide; the closest is in Solwezi, Zambia).
 */
import { workday } from "../adapters/workday";
import { defineSource } from "../types";

export default defineSource({
  id: "weir",
  name: "Weir Minerals",
  website: "https://weir.wd3.myworkdayjobs.com/Weir_External_Careers",
  kind: "contractor",
  scrape: (ctx) =>
    workday(ctx, {
      tenant: "weir",
      instance: "wd3",
      site: "Weir_External_Careers",
      countryFacet: "Country",
      company: "Weir Minerals",
    }),
});
