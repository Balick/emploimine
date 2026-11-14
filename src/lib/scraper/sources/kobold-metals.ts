/**
 * KoBold Metals DRC: lithium exploration at Manono (Tanganyika), office in
 * Lubumbashi.
 *
 * Endpoint: Greenhouse public Job Board API, board "koboldmetalsdrc".
 * robots.txt: API host, no restriction. Verified 2026-11-14 (8 DRC offers).
 */
import { greenhouse } from "../adapters/greenhouse";
import { defineSource } from "../types";

export default defineSource({
  id: "kobold-metals",
  name: "KoBold Metals",
  website: "https://job-boards.greenhouse.io/koboldmetalsdrc",
  kind: "employer",
  scrape: (ctx) => greenhouse(ctx, { board: "koboldmetalsdrc", company: "KoBold Metals" }),
});
