"use client";

import { useSearchContext } from "@/context/search-context";
import { Search } from "lucide-react";
import { Input } from "./ui/input";

export default function SearchBar() {
  const { term, updateTerm } = useSearchContext();

  return (
    <form id="form" className="h-[48px] relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
      <Input
        defaultValue={term}
        onChange={(e) => updateTerm(e.target.value)}
        placeholder="Chercher par emploi, entreprise..."
        className="absolute inset-0 pl-10 rounded-xl text-[16px] h-full w-full border-2 focus:border-[#ffbef1] ring ring-transparent focus:ring-[#fbe8f7] hover:ring-[#fbe8f7] transition-all duration-300"
      />
    </form>
  );
}
