import { describe, expect, it } from "vitest";
import { findDrcCity, isInDrc, normalizeContractType, parseDate } from "./utils";

describe("isInDrc", () => {
  it.each([
    "Kolwezi, Lualaba",
    "Lubumbashi",
    "Democratic Republic of the Congo",
    "Democratic Republic of Congo",
    "République Démocratique du Congo",
    "Congo, The Democratic Republic of the",
    "Manono, DRC",
    "Kinshasa, RDC",
    "Durba, Haut-Uele",
    "CD",
  ])("accepts %s", (location) => expect(isInDrc(location)).toBe(true));

  it.each([
    "Brazzaville, Republic of the Congo",
    "Pointe-Noire, Congo",
    "Remote",
    "Johannesburg, South Africa",
    "Lusaka, Zambia",
    "",
    null,
  ])("rejects %s", (location) => expect(isInDrc(location)).toBe(false));

  it("checks every value given", () => {
    expect(isInDrc("Site office", "Kolwezi")).toBe(true);
  });
});

describe("findDrcCity", () => {
  it("prefers the city over the province", () => {
    expect(findDrcCity("Lualaba, Kolwezi")).toBe("Kolwezi");
    expect(findDrcCity("Mbuji-Mayi, Kasaï-Oriental")).toBe("Mbuji-Mayi");
  });
  it("returns null when no DRC place is found", () => {
    expect(findDrcCity("Remote")).toBeNull();
  });
  it("does not treat a province as a city", () => {
    expect(findDrcCity("Lualaba, DRC")).toBeNull();
  });
  it("maps mine sites and misspellings to the nearest town", () => {
    expect(findDrcCity("Kolwazi, Democratic Republic of the Congo")).toBe("Kolwezi");
    expect(findDrcCity("Kamoto, RDC – Exploitation souterraine")).toBe("Kolwezi");
    expect(findDrcCity("Kibali Gold Mine")).toBe("Durba");
  });
  it("does not read the country label Congo-Kinshasa as the city", () => {
    expect(findDrcCity("Durba, Haut Uele, Congo-Kinshasa")).toBe("Durba");
    expect(findDrcCity("Congo-Kinshasa")).toBeNull();
  });
});

describe("isInDrc (aliases and spellings)", () => {
  it.each(["Rép démocratique du Congo", "Rep. Dem. du Congo", "Haut Uele", "Kamoto", "Congo, Dem. Rep."])(
    "accepts %s",
    (location) => expect(isInDrc(location)).toBe(true)
  );
  it("rejects the Republic of the Congo without a DRC place", () => {
    expect(isInDrc("République du Congo")).toBe(false);
  });
});

describe("parseDate", () => {
  it.each([
    ["2026-11-14", "2026-11-14"],
    ["2026-11-14T08:30:00Z", "2026-11-14"],
    ["14/11/2026", "2026-11-14"],
    ["14-11-2026", "2026-11-14"],
    ["14.11.26", "2026-11-14"],
    ["14 Nov 2026", "2026-11-14"],
    ["14 nov. 2026", "2026-11-14"],
    ["14 novembre 2026", "2026-11-14"],
    ["1er mars 2026", "2026-03-01"],
    ["14 févr. 2026", "2026-02-14"],
    ["3 août 2026", "2026-08-03"],
    ["Nov 14, 2026", "2026-11-14"],
    ["November 14th 2026", "2026-11-14"],
    ["Fri, 13 Nov 2026 08:00:00 GMT", "2026-11-13"],
  ])("parses %s", (input, expected) => expect(parseDate(input)).toBe(expected));

  it("reads numeric dates day-first unless told otherwise", () => {
    expect(parseDate("03/04/2026")).toBe("2026-04-03");
    expect(parseDate("03/04/2026", { monthFirst: true })).toBe("2026-03-04");
  });

  it("converts timestamps to the requested time zone", () => {
    expect(parseDate("2026-11-13T23:00:00Z")).toBe("2026-11-13");
    expect(parseDate("2026-11-13T23:00:00Z", { timeZone: "Africa/Lubumbashi" })).toBe("2026-11-14");
    expect(parseDate(Date.UTC(2026, 10, 13, 23), { timeZone: "Africa/Kinshasa" })).toBe("2026-11-14");
  });

  it.each(["", null, undefined, "bientôt", "31/02/2026", "Date limite : à préciser"])(
    "returns null for %s",
    (input) => expect(parseDate(input)).toBeNull()
  );
});

describe("normalizeContractType", () => {
  it.each([
    ["Permanent", "CDI"],
    ["Full-time, permanent", "CDI"],
    ["Permanent contract", "CDI"],
    ["Contrat à durée indéterminée", "CDI"],
    ["Contract", "CDD"],
    ["CDI", "CDI"],
    ["Contrat à durée déterminée", "CDD"],
    ["Fixed Term", "CDD"],
    ["Internship", "Stage"],
    ["Stagiaire", "Stage"],
    ["Temporary", "Intérim"],
    ["Consultant", "Consultance"],
  ])("maps %s to %s", (input, expected) => expect(normalizeContractType(input)).toBe(expected));

  it("returns null when unknown or ambiguous", () => {
    expect(normalizeContractType("Full-time")).toBeNull();
    expect(normalizeContractType("CDI / CDD (à définir)")).toBeNull();
    expect(normalizeContractType(null)).toBeNull();
  });

  it("does not mistake words starting with 'intern' for internships", () => {
    expect(normalizeContractType("International Sales Manager")).toBeNull();
    expect(normalizeContractType("Auditeur interne")).toBeNull();
    expect(normalizeContractType("Graduate Trainee Programme")).toBe("Stage");
  });
});
