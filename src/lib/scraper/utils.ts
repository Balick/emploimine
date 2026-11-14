import type { ContractType } from "./types";

/* -------------------------------------------------------------------------- */
/*                                  Location                                  */
/* -------------------------------------------------------------------------- */

/** Lowercase and remove accents: "Rép. Démocratique" -> "rep. democratique". */
export function foldText(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}
const strip = foldText;

/** DRC towns where mining jobs are located (canonical spelling). */
export const DRC_CITIES = [
  // Haut-Katanga, Lualaba
  "Lubumbashi", "Kolwezi", "Likasi", "Kipushi", "Fungurume", "Kambove", "Kakanda",
  "Sakania", "Kasumbalesa", "Mutanda", "Pweto", "Kamina",
  // Tanganyika, Maniema, Kivu
  "Manono", "Kalemie", "Kindu", "Kalima", "Kamituga", "Misisi", "Bukavu", "Goma",
  "Uvira", "Walikale", "Butembo", "Beni",
  // Ituri, Haut-Uele, Tshopo
  "Bunia", "Mongbwalu", "Durba", "Watsa", "Isiro", "Kisangani",
  // Kasaï, Kongo-Central, Kinshasa, Équateur
  "Mbuji-Mayi", "Kananga", "Tshikapa", "Mwene-Ditu", "Kabinda", "Matadi", "Boma",
  "Moanda", "Kinshasa", "Mbandaka", "Gbadolite", "Kikwit",
];

/** Mine sites and common misspellings, mapped to the nearest town. */
const DRC_ALIASES: Record<string, string> = {
  kolwazi: "Kolwezi",
  kamoto: "Kolwezi",
  kamoa: "Kolwezi",
  kakula: "Kolwezi",
  mutoshi: "Kolwezi",
  metalkol: "Kolwezi",
  tenke: "Fungurume",
  kisanfu: "Fungurume",
  kinsevere: "Lubumbashi",
  ruashi: "Lubumbashi",
  kibali: "Durba",
  bisie: "Walikale",
  twangiza: "Bukavu",
};

/** Provinces and regions: they locate an offer in the DRC but are not cities. */
const DRC_REGIONS = [
  "Lualaba", "Haut-Katanga", "Haut-Lomami", "Katanga", "Tanganyika", "Maniema",
  "Nord-Kivu", "North Kivu", "Sud-Kivu", "South Kivu", "Ituri", "Haut-Uele",
  "Bas-Uele", "Tshopo", "Kasai", "Kasai-Oriental", "Kasai-Central", "Lomami",
  "Sankuru", "Kongo-Central", "Kwilu", "Equateur",
];

/** "Haut-Uele" also matches "Haut Uele" and "HautUele". */
const placePattern = (place: string) => strip(place).replace(/-/g, "[- ]?");

const PLACE_REGEX = new RegExp(
  `\\b(${[...DRC_CITIES, ...DRC_REGIONS, ...Object.keys(DRC_ALIASES)].map(placePattern).join("|")})\\b`
);

const DRC_PATTERNS = [
  /\b(rdc|drc|d\.r\.c\.?|r\.d\.c\.?)\b/,
  /democratic republic of (the )?congo/,
  /\brep(ublique|\.)? (democratique|dem\.?) du congo\b/,
  /\bcongo,? (the )?(democratic republic|dem\.? rep\.?)( of)?\b/,
  /\bcongo[- ]kinshasa\b/,
  /\bdr congo\b/,
  /\brd congo\b/,
  PLACE_REGEX,
];

/**
 * True when a free-text location (or country code) points to the DRC.
 * "Republic of the Congo" (Brazzaville) is deliberately rejected.
 */
export function isInDrc(...values: (string | null | undefined)[]): boolean {
  const text = strip(values.filter(Boolean).join(" | "));
  if (!text) return false;
  if (/\bcd\b/.test(text) && text.trim().length <= 3) return true;
  if (/brazzaville|pointe-noire/.test(text)) return false;
  return DRC_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * First DRC town found in a location string, with its canonical spelling.
 * Mine sites and misspellings map to the nearest town ("Kamoto" -> Kolwezi).
 * Provinces alone return `null`: they are not a city.
 */
export function findDrcCity(location: string | null | undefined): string | null {
  if (!location) return null;
  // "Congo-Kinshasa" is the country, not the city of Kinshasa.
  const text = strip(location).replace(/\bcongo[- ]kinshasa\b/g, " ");
  const match = (place: string) => new RegExp(`\\b${placePattern(place)}\\b`).test(text);
  const city = DRC_CITIES.find(match);
  if (city) return city;
  const alias = Object.keys(DRC_ALIASES).find(match);
  return alias ? DRC_ALIASES[alias] : null;
}

/* -------------------------------------------------------------------------- */
/*                                    Dates                                   */
/* -------------------------------------------------------------------------- */

const MONTHS: Record<string, number> = {
  jan: 1, janv: 1, january: 1, janvier: 1,
  feb: 2, fev: 2, fevr: 2, february: 2, fevrier: 2,
  mar: 3, march: 3, mars: 3,
  apr: 4, avr: 4, april: 4, avril: 4,
  may: 5, mai: 5,
  jun: 6, june: 6, juin: 6,
  jul: 7, juil: 7, july: 7, juillet: 7,
  aug: 8, aou: 8, august: 8, aout: 8,
  sep: 9, sept: 9, september: 9, septembre: 9,
  oct: 10, october: 10, octobre: 10,
  nov: 11, november: 11, novembre: 11,
  dec: 12, december: 12, decembre: 12,
};

const pad = (n: number) => String(n).padStart(2, "0");

function toIso(year: number, month: number, day: number): string | null {
  if (year < 100) year += 2000;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Parse the date formats met on career sites into `YYYY-MM-DD`:
 * ISO strings/timestamps, `dd/mm/yyyy`, `dd-mm-yyyy`, `14 Nov 2026`,
 * `Nov 14, 2026`, `14 novembre 2026`, epoch milliseconds…
 * Day-first is assumed for numeric dates unless `monthFirst` is set.
 * Returns `null` when the value cannot be parsed reliably.
 */
export function parseDate(
  value: string | number | Date | null | undefined,
  {
    monthFirst = false,
    timeZone,
  }: {
    monthFirst?: boolean;
    /**
     * For timestamps (with a time part), the zone in which to read the calendar
     * day. Some ATS serialise a local midnight in UTC ("2026-11-13T23:00:00Z"
     * for 14 November in Kinshasa): pass e.g. "Africa/Lubumbashi" to get the
     * intended day. Without it, the date part of the string is used as is.
     */
    timeZone?: string;
  } = {}
): string | null {
  if (value === null || value === undefined || value === "") return null;

  const inZone = (date: Date) =>
    Number.isNaN(date.getTime())
      ? null
      : timeZone
        ? date.toLocaleDateString("en-CA", { timeZone })
        : date.toISOString().slice(0, 10);

  if (value instanceof Date || typeof value === "number") return inZone(new Date(value));

  if (timeZone && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value.trim())) {
    return inZone(new Date(value.trim()));
  }

  const text = strip(value).trim();

  // 2026-11-14, 2026-11-14T08:00:00Z
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return toIso(+match[1], +match[2], +match[3]);

  // 14/11/2026, 14-11-2026, 14.11.2026 (or 11/14/2026 with monthFirst)
  match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (match) {
    const [a, b] = [+match[1], +match[2]];
    return monthFirst ? toIso(+match[3], a, b) : toIso(+match[3], b, a);
  }

  // 14 nov. 2026, 14 novembre 2026, 1er mars 2026
  match = text.match(/(\d{1,2})(?:er|st|nd|rd|th)?\s+([a-z]+)\.?,?\s+(\d{4})/);
  if (match && MONTHS[match[2]]) return toIso(+match[3], MONTHS[match[2]], +match[1]);

  // Nov 14, 2026 / November 14 2026
  match = text.match(/([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/);
  if (match && MONTHS[match[1]]) return toIso(+match[3], MONTHS[match[1]], +match[2]);

  // RFC 2822 (RSS): "Fri, 14 Nov 2026 08:00:00 GMT" is covered above; last
  // resort for anything else Date understands unambiguously.
  if (/^[a-z]{3}, \d{1,2} [a-z]{3} \d{4}/.test(text)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*                                  Contracts                                 */
/* -------------------------------------------------------------------------- */

/** Map free-text employment types ("Full-time permanent", "Fixed term"…) to ours. */
export function normalizeContractType(
  value: string | null | undefined
): ContractType | null {
  if (!value) return null;
  const text = strip(value);
  // "CDI / CDD (à définir)": ambiguous, do not guess.
  if (/\bcdi\b/.test(text) && /\bcdd\b/.test(text)) return null;
  if (/\b(stage|stagiaire|intern|internship|graduate (trainee|program(me)?)|apprenti(ssage)?)\b/.test(text)) {
    return "Stage";
  }
  if (/\b(interim|temp(orary)?|temporaire)\b/.test(text)) return "Intérim";
  if (/\b(consultan|freelance|independant|contractor)/.test(text)) return "Consultance";
  // Explicit terms first, the generic "contract" last ("Permanent contract" is a CDI).
  if (/\b(cdd|fixed[- ]term|duree determinee)/.test(text)) return "CDD";
  if (/\b(cdi|permanent|indefinite|duree indeterminee|regular)/.test(text)) return "CDI";
  if (/\bcontract\b/.test(text)) return "CDD";
  return null;
}

/* -------------------------------------------------------------------------- */
/*                                    Text                                    */
/* -------------------------------------------------------------------------- */

/** Collapse whitespace and trim; returns `null` for empty strings. */
export function clean(value: string | null | undefined): string | null {
  const text = value?.replace(/\s+/g, " ").trim();
  return text ? text : null;
}

/** Resolve a possibly relative link against the page it was found on. */
export function absoluteUrl(href: string, base: string): string {
  return new URL(href, base).toString();
}
