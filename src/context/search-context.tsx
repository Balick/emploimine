"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type Filters = {
  companies: string[];
  postsVacants: string[];
  contrat: string[];
};

type SearchContextValue = {
  term: string;
  updateTerm: (term: string) => void;
  filters: Filters;
  updateFilter: (name: keyof Filters, value: string[]) => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [term, setTerm] = useState("");
  const [filters, setFilters] = useState<Filters>({
    companies: [],
    postsVacants: [],
    contrat: [],
  });

  const updateFilter = useCallback(
    (name: keyof Filters, value: string[]) =>
      setFilters((prev) => ({ ...prev, [name]: value })),
    []
  );

  const value = useMemo(
    () => ({ term, updateTerm: setTerm, filters, updateFilter }),
    [term, filters, updateFilter]
  );

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function useSearchContext() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearchContext must be used within a <SearchProvider>");
  }
  return context;
}
