import type { Source } from "../types";

// Mining companies
import barrick from "./barrick";
import glencore from "./glencore";
import ivanhoeMines from "./ivanhoe-mines";
import kamoaCopper from "./kamoa-copper";
import koboldMetals from "./kobold-metals";
// Contractors and suppliers working on DRC mine sites
import agl from "./agl";
import biaGroup from "./bia-group";
import cis from "./cis";
import epiroc from "./epiroc";
import hatch from "./hatch";
import metso from "./metso";
import orica from "./orica";
import sgs from "./sgs";
import trafigura from "./trafigura";
import weir from "./weir";
// Recruitment agencies specialised in mining
import gladysSynergies from "./gladys-synergies";
import kilele from "./kilele";
// Job boards (filtered on mining offers, de-duplicated against the sources above)
import mediacongo from "./mediacongo";
import miningCom from "./mining-com";

/**
 * Every source scraped by `npm run scrape`. To add one, create
 * `sources/<id>.ts` (see CONTRIBUTING.md) and list it here.
 */
export const sources: Source[] = [
  barrick,
  glencore,
  ivanhoeMines,
  kamoaCopper,
  koboldMetals,
  agl,
  biaGroup,
  cis,
  epiroc,
  hatch,
  metso,
  orica,
  sgs,
  trafigura,
  weir,
  gladysSynergies,
  kilele,
  mediacongo,
  miningCom,
];
