/**
 * Trafigura: commodity trader; in the DRC its logistics arm (Impala
 * Terminals, "LAI") moves copper and cobalt from Kolwezi and Lubumbashi.
 *
 * Endpoint: Workday CXS API, tenant "trafigura" (wd3), site
 * "TrafiguraCareerSite", country facet "locationCountry".
 * robots.txt: `/TrafiguraCareerSite/` allowed, `/wday/cxs/` not restricted
 * (only `/refreshFacet/` is disallowed). Verified 2026-11-14 (1 DRC offer).
 *
 * The "ImpalaCareerSite" site of the same tenant had no DRC offer on that day.
 */
import { workday } from "../adapters/workday";
import { defineSource } from "../types";

export default defineSource({
  id: "trafigura",
  name: "Trafigura",
  website: "https://trafigura.wd3.myworkdayjobs.com/TrafiguraCareerSite",
  kind: "contractor",
  scrape: (ctx) =>
    workday(ctx, {
      tenant: "trafigura",
      instance: "wd3",
      site: "TrafiguraCareerSite",
      countryFacet: "locationCountry",
      company: "Trafigura",
    }),
});
