/**
 * SGS: testing, inspection and certification group; SGS Minerals DRC runs
 * mine-site laboratories around Kolwezi (Lualaba).
 *
 * Endpoint: SmartRecruiters public career site, company "SGS"
 * (careers.smartrecruiters.com/SGS?search=Congo, then one offer page each on
 * jobs.smartrecruiters.com). The Posting API is not used: its robots.txt
 * disallows every bot but LinkedInBot.
 * robots.txt: careers.smartrecruiters.com redirects /robots.txt to its
 * homepage and jobs.smartrecruiters.com answers 404, so no restriction.
 * Verified 2026-11-14 (3 DRC offers, all in "Kolwazi", a misspelling of
 * Kolwezi that findDrcCity maps back to Kolwezi).
 */
import { smartRecruiters } from "../adapters/smartrecruiters";
import { defineSource } from "../types";

export default defineSource({
  id: "sgs",
  name: "SGS",
  website: "https://careers.smartrecruiters.com/SGS",
  kind: "contractor",
  scrape: (ctx) => smartRecruiters(ctx, { company: "SGS", displayName: "SGS" }),
});
