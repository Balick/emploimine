"use client";

import { useSearchContext } from "@/context/search-context";
import { Search } from "lucide-react";
import { Input } from "./ui/input";

export default function SearchBar() {
  const { term, updateTerm } = useSearchContext();

  return (
    <form role="search" className="h-[48px] relative" onSubmit={(e) => e.preventDefault()}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" aria-hidden />
      <Input
        type="search"
        value={term}
        onChange={(e) => updateTerm(e.target.value)}
        aria-label="Rechercher une offre"
        placeholder="Chercher par emploi, entreprise, ville..."
        className="absolute inset-0 pl-10 rounded-xl text-[16px] h-full w-full border-2 focus:border-[#ffbef1] ring-3 ring-transparent focus:ring-[#fbe8f7] hover:ring-[#fbe8f7] transition-all duration-300"
      />
    </form>
  );
}
