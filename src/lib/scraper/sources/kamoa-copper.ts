/**
 * Kamoa Copper SA: Kamoa-Kakula copper complex near Kolwezi (Lualaba),
 * joint venture of Ivanhoe Mines, Zijin Mining and the DRC government.
 *
 * Endpoint: Simplify.hr tenant "kamoacoppersa", HTML fragment
 * https://kamoacoppersa.simplify.hr/vacancy/vacancies?query=&displayOrder=0
 * plus the detail page /Vacancy/<code> of each DRC vacancy.
 * robots.txt: `Allow: /`, only /Vacancy/Apply/* disallowed (not requested).
 * Verified 2026-11-14 (0 vacancies: "There are currently no open jobs listed").
 */
import { simplify } from "../adapters/simplify";
import { defineSource } from "../types";

export default defineSource({
  id: "kamoa-copper",
  name: "Kamoa Copper",
  website: "https://kamoacoppersa.simplify.hr/",
  kind: "employer",
  scrape: (ctx) => simplify(ctx, { tenant: "kamoacoppersa", company: "Kamoa Copper" }),
});
