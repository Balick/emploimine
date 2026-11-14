import type { Source } from "../types";

import koboldMetals from "./kobold-metals";

/**
 * Every source scraped by `npm run scrape`. To add one, create
 * `sources/<id>.ts` (see CONTRIBUTING.md) and list it here.
 */
export const sources: Source[] = [koboldMetals];
