/** Time zone used for "today" everywhere (Lubumbashi and Kolwezi, UTC+2). */
export const DRC_TIME_ZONE = "Africa/Lubumbashi";

/** A calendar date (YYYY-MM-DD) as seen in the DRC mining regions. */
export function drcDate(value: Date | string | number = new Date()): string {
  return new Date(value).toLocaleDateString("en-CA", { timeZone: DRC_TIME_ZONE });
}

/** Today's date in the DRC, as YYYY-MM-DD. */
export function today(): string {
  return drcDate();
}

/** An offer is open while its source still lists it and its deadline is not past. */
export function isOpen(
  offer: { removed_at: string | null; closes_at: string | null },
  on: string = today()
): boolean {
  return !offer.removed_at && (!offer.closes_at || offer.closes_at >= on);
}
