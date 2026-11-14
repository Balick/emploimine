/**
 * Ivanhoe Mines: Kamoa-Kakula (copper, Kolwezi, with Zijin), Kipushi (zinc,
 * Haut-Katanga) and the Ivanhoe Mines DRC office in Lubumbashi; the same
 * board also lists South African (Platreef, Mokopane) vacancies, which are
 * filtered out.
 *
 * Endpoint: Simplify.hr tenant "ivanhoemines", HTML fragment
 * https://ivanhoemines.simplify.hr/vacancy/vacancies?query=&displayOrder=0
 * plus the detail page /Vacancy/<code> of each DRC vacancy.
 * robots.txt: `Allow: /`, only /Vacancy/Apply/* disallowed (not requested).
 * Verified 2026-11-14 (8 vacancies, 2 in the DRC: Lubumbashi).
 */
import { simplify, type SimplifyVacancy } from "../adapters/simplify";
import { defineSource } from "../types";

/**
 * Vacancies of the DRC operating companies are posted on the group board;
 * credit them to the subsidiary only when the Division/branch says so (the
 * description often mentions every entity, so it is not used).
 */
function resolveCompany({ division, branch }: SimplifyVacancy): string | null {
  const text = `${division ?? ""} ${branch ?? ""}`;
  if (/kipushi|\bkico\b/i.test(text)) return "Kipushi Corporation";
  if (/kamoa/i.test(text)) return "Kamoa Copper";
  return null;
}

export default defineSource({
  id: "ivanhoe-mines",
  name: "Ivanhoe Mines",
  website: "https://ivanhoemines.simplify.hr/",
  kind: "employer",
  scrape: (ctx) =>
    simplify(ctx, { tenant: "ivanhoemines", company: "Ivanhoe Mines", resolveCompany }),
});
