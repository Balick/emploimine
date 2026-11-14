import { describe, expect, it } from "vitest";
import { isOpen } from "./dates";
import { formatDate, getElapsedTime } from "./utils";

describe("getElapsedTime", () => {
  const today = "2026-11-14";

  it.each([
    ["2026-11-14", "Aujourd'hui"],
    ["2026-11-13", "Hier"],
    ["2026-11-11", "Il y a 3 jours"],
    ["2026-11-07", "Il y a 1 semaine"],
    ["2026-10-24", "Il y a 3 semaines"],
    ["2026-08-14", "Il y a 3 mois"],
    ["2024-11-01", "Il y a 2 ans"],
  ])("%s -> %s", (value, expected) => expect(getElapsedTime(value, today)).toBe(expected));

  it("reads timestamps in DRC time, not UTC", () => {
    // 23:30 UTC on the 13th is already the 14th in Lubumbashi (UTC+2).
    expect(getElapsedTime("2026-11-13T23:30:00Z", today)).toBe("Aujourd'hui");
    expect(getElapsedTime("2026-11-13T21:30:00Z", today)).toBe("Hier");
  });

  it("handles missing or invalid dates", () => {
    expect(getElapsedTime(null, today)).toBe("Date inconnue");
    expect(getElapsedTime("n'importe quoi", today)).toBe("Date inconnue");
  });
});

describe("formatDate", () => {
  it("formats calendar dates without shifting the day", () => {
    expect(formatDate("2026-11-01")).toBe("1 novembre 2026");
    expect(formatDate(null)).toBeNull();
  });
});

describe("isOpen", () => {
  it("is open until the end of the deadline day, and closed once removed", () => {
    expect(isOpen({ removed_at: null, closes_at: "2026-11-14" }, "2026-11-14")).toBe(true);
    expect(isOpen({ removed_at: null, closes_at: "2026-11-13" }, "2026-11-14")).toBe(false);
    expect(isOpen({ removed_at: null, closes_at: null }, "2026-11-14")).toBe(true);
    expect(isOpen({ removed_at: "2026-11-10T00:00:00Z", closes_at: null }, "2026-11-14")).toBe(false);
  });
});
