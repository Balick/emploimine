"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "./ui/input";

export default function SearchBar() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set("query", term);
    } else {
      params.delete("query");
    }
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  const scrollToSearch = () => {
    document.getElementById("form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    if (searchParams.has("query")) {
      scrollToSearch();
    }
  }, []);

  return (
    <form id="form" className="h-[48px] relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
      <Input
        onFocus={scrollToSearch}
        defaultValue={searchParams.get("query")?.toString()}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Chercher par emploi, entreprise..."
        className="absolute inset-0 pl-10 rounded-xl text-[16px] h-full w-full border-2 focus:border-[#ffbef1] ring ring-transparent focus:ring-[#fbe8f7] hover:ring-[#fbe8f7] transition-all duration-300"
      />
    </form>
  );
}
