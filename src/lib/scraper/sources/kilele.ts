/**
 * Kilele DRC (Kilele SARL): staffing and recruitment for the copper-cobalt
 * mines around Kolwezi (Lualaba); offers name the site (e.g. Kamoto) in the
 * description.
 *
 * Endpoint: Manatal careers-page.com JSON API, slug "kileledrc"
 * (www.careers-page.com/api/v1.0/c/kileledrc/jobs/). The board is DRC-only
 * but one offer has no structured location: its "Lieu : Kamoto, RDC" line is
 * used instead.
 * robots.txt: www.careers-page.com/robots.txt answers 404, so no restriction.
 * Verified 2026-11-14 (22 DRC offers).
 */
import { manatal } from "../adapters/manatal";
import { defineSource } from "../types";

export default defineSource({
  id: "kilele",
  name: "Kilele DRC",
  website: "https://www.careers-page.com/kileledrc",
  kind: "recruiter",
  scrape: (ctx) => manatal(ctx, { slug: "kileledrc", company: "Kilele DRC" }),
});
