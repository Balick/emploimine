import Aside from "@/components/aside";
import FilterButton from "@/components/FilterBtn";
import Hero from "@/components/hero";
import Offers from "@/components/offers";
import PostsSkeleton from "@/components/postsSkeleton";
import SearchBar from "@/components/searchbar";
import { SearchProvider } from "@/context/search-context";
import type { Metadata } from "next";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "EmploiMine | Offres d'emploi dans le secteur minier",
    description:
      "Recherchez des offres d'emploi en république démocratique du Congo dans le secteur minier",
  };
}

export default async function Home() {
  return (
    <SearchProvider>
      <main className="main pb-20">
        <Hero />
        <div>
          <Aside />
          <div className="lg:w-[65%] top-0">
            <SearchBar />
            <section>
              <div className="flex items-center justify-between my-[40px]">
                <h1 className="font-mona font-bold leading-[24px] text-lg">
                  Offres récentes
                </h1>
                <FilterButton />
              </div>
              <Suspense fallback={<PostsSkeleton />}>
                <Offers />
              </Suspense>
            </section>
          </div>
        </div>
      </main>
    </SearchProvider>
  );
}
