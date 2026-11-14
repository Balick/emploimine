/**
 * Barrick: Kibali gold mine (Durba/Doko, Haut-Uele), operated by Barrick
 * (45 %) with AngloGold Ashanti (45 %) and SOKIMO (10 %). The global Barrick
 * board (~470 offers: Nevada, Argentina, Tanzania, Zambia…) is filtered on
 * the DRC.
 *
 * Endpoint: jobs.barrick.com is a JavaScript shell for the Oracle HCM
 * Candidate Experience site CX_1001 on ehkn.fa.ca2.oraclecloud.com; we call its
 * public REST API (`recruitingCEJobRequisitions`, filtered on the
 * "DR Congo-Kinshasa" geography, then `recruitingCEJobRequisitionDetails`).
 * The older site number CX_1 serves the same board through the API, but its
 * pages (`/sites/CX_1/job/<id>`) 302 to CX_1001, so CX_1001 is used throughout.
 * robots.txt: none on ehkn.fa.ca2.oraclecloud.com nor jobs.barrick.com (404),
 * so no restriction. Verified 2026-11-14 (473 offers on the board, 6 in the
 * DRC: Durba).
 */
import { oracleHcm } from "../adapters/oracle-hcm";
import { defineSource } from "../types";

/**
 * Geography id of "DR Congo-Kinshasa" in the site's Location facet. If it ever
 * changes the API ignores it and returns the whole board, which the adapter
 * still filters on the DRC (just with more requests).
 */
const DRC_LOCATION_ID = 300000000273763;

export default defineSource({
  id: "barrick",
  name: "Barrick - Kibali Gold Mines",
  website: "https://jobs.barrick.com/",
  kind: "employer",
  scrape: (ctx) =>
    oracleHcm(ctx, {
      host: "ehkn.fa.ca2.oraclecloud.com",
      siteNumber: "CX_1001",
      company: "Barrick",
      locationId: DRC_LOCATION_ID,
      // Barrick's only DRC operation is Kibali; its site is Durba/Doko in Haut-Uele.
      resolveCompany: ({ location }) =>
        /\b(kibali|durba|doko|haut[- ]?uele)\b/i.test(location) ? "Kibali Gold Mines" : null,
    }),
});
