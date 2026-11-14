/**
 * Gladys Synergies: recruitment firm (France / DRC) hiring for clients in
 * every sector, mostly in Kinshasa, Lubumbashi and Kolwezi.
 *
 * Endpoint: Manatal careers-page.com JSON API, slug "gladys-synergies"
 * (www.careers-page.com/api/v1.0/c/gladys-synergies/jobs/, ~290 offers in
 * 15 pages of 20). Clients are anonymous ("Notre client, un acteur majeur du
 * secteur minier…"), so the company is Gladys Synergies unless a description
 * names the employer on a "Client : …" line.
 * robots.txt: www.careers-page.com/robots.txt answers 404, so no restriction.
 * Quirk: some offers are advertised from Paris or Brussels (structured
 * location) for a job in the DRC ("Lieu de travail : Lubumbashi (RDC)"), and
 * re-posted copies keep the original's "Job Reference": the adapter handles
 * both.
 * Verified 2026-11-14 (292 offers, 63 mining-related ones in the DRC).
 */
import { labelledValues, manatal, type ManatalOffer } from "../adapters/manatal";
import { defineSource } from "../types";

/**
 * Mining relevance filter. Most descriptions carry a "Secteur : …" /
 * "Sector: …" line ("Minier", "Mining – Copper", "Distribution d'équipements
 * industriels et miniers"…); the keywords below are matched against that
 * sector and the title only (lowercase, accents stripped). The rest of the
 * description is deliberately ignored: banks, telecoms or logistics firms
 * routinely list "le secteur minier" among their clients. Town names
 * (Kolwezi, Fungurume…) are not keywords either: they let through e.g. a
 * consulate or a telecom offer based in Kolwezi.
 */
const MINING_KEYWORDS = [
  // Mines and the trade.
  "mines?",
  "mining",
  "minier(e|s|es)?",
  "minerais?",
  "minerals?",
  "mineraux",
  "metals?",
  "metaux",
  // Geology, drilling and blasting.
  String.raw`geolog\w*`,
  "foreuses?",
  "forage",
  String.raw`drill\w*`,
  "jumbo",
  "blasting",
  "boutefeu",
  "explosifs?",
  // Extraction and processing.
  "underground",
  "souterraine?",
  "open[- ]pit",
  "ciel ouvert",
  "load and haul",
  String.raw`(hydro)?metallurg\w*`,
  "process plant",
  "usine de traitement",
  "concentrat(eur|or)",
  "tailings",
  // Commodities mined in the DRC.
  "cuivre",
  "copper",
  "cobalt",
  "lithium",
  "coltan",
  "gold",
  "diamant",
  "diamond",
];
const MINING_PATTERN = new RegExp(String.raw`\b(${MINING_KEYWORDS.join("|")})\b`);

const strip = (value: string) =>
  value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function isMiningOffer({ title, lines }: ManatalOffer): boolean {
  const sectors = labelledValues(lines, ["secteur", "sector"]);
  return MINING_PATTERN.test(strip([title, ...sectors].join(" | ")));
}

export default defineSource({
  id: "gladys-synergies",
  name: "Gladys Synergies",
  website: "https://www.careers-page.com/gladys-synergies",
  kind: "recruiter",
  scrape: (ctx) =>
    manatal(ctx, { slug: "gladys-synergies", company: "Gladys Synergies", isRelevant: isMiningOffer }),
});
