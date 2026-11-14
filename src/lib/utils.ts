import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { drcDate } from "./dates";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Parse a `YYYY-MM-DD` date (or ISO timestamp) as a UTC date. */
function toDate(value: string): Date {
  return new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
}

/** "14 novembre 2026" */
export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** "14/11/2026" */
export function formatShortDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("fr-FR", { timeZone: "UTC" });
}

/**
 * Relative time in French: "Aujourd'hui", "Hier", "Il y a 3 jours"…
 * Days are counted in DRC time. Pass `today` (YYYY-MM-DD) computed on the
 * server so that the server render and the hydration agree.
 */
export function getElapsedTime(value: string | null | undefined, today: string = drcDate()): string {
  if (!value) return "Date inconnue";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";

  // A plain date is already a calendar day; a timestamp is read in DRC time.
  const day = value.length === 10 ? value : drcDate(date);
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86_400_000);

  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `Il y a ${weeks} semaine${weeks > 1 ? "s" : ""}`;
  }
  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
  const years = Math.floor(days / 365);
  return `Il y a ${years} an${years > 1 ? "s" : ""}`;
}

/** Date used to sort and display "posted …": publication date, else first time we saw it. */
export function postedAt(offer: { published_at: string | null; first_seen_at: string }): string {
  return offer.published_at ?? offer.first_seen_at;
}
