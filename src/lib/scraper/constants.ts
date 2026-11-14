// Dependency-free constants, safe to import from client components.

export const CONTRACT_TYPES = [
  "CDI",
  "CDD",
  "Stage",
  "Consultance",
  "Intérim",
] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_LABELS: Record<ContractType, string> = {
  CDI: "Contrat à durée indéterminée (CDI)",
  CDD: "Contrat à durée déterminée (CDD)",
  Stage: "Stage",
  Consultance: "Consultance",
  Intérim: "Intérim",
};

export const SOURCE_KINDS = [
  "employer",
  "contractor",
  "recruiter",
  "job_board",
] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];
