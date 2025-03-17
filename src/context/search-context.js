"use client";

import { createContext, useContext, useState } from "react";

const SearchContext = createContext();

export const SearchProvider = ({ children }) => {
  const [term, setTerm] = useState("");
  const [filters, setFilters] = useState({
    companies: [],
    postsVacants: [],
    contrat: [],
  });

  const updateTerm = (newTerm) => setTerm(newTerm);

  const updateFilter = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  return (
    <SearchContext.Provider value={{ term, updateTerm, filters, updateFilter }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearchContext = () => useContext(SearchContext);
