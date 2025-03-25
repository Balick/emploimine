import Aside from "@/components/aside";
import FilterButton from "@/components/FilterBtn";
import OldOffers from "@/components/old-offers";
import PostsSkeleton from "@/components/postsSkeleton";
import SearchBar from "@/components/searchbar";
import { SearchProvider } from "@/context/search-context";
import type { Metadata } from "next";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "EmploiMine | Historique des offres d'emploi",
    description:
      "Recherchez les anciennes offres d'emploi en république démocratique du Congo",
  };
}

export default async function Home() {
  return (
    <SearchProvider>
      <main className="main pb-20 py-14">
        <div>
          <Aside />
          <div className="lg:w-[65%] top-0">
            <SearchBar />
            <section>
              <div className="flex items-center justify-between my-[40px]">
                <h1 className="font-mona font-bold leading-[24px] text-lg">
                  Historique des offres d&apos;emploi
                </h1>
                <FilterButton />
              </div>
              <Suspense fallback={<PostsSkeleton />}>
                <OldOffers />
              </Suspense>
            </section>
          </div>
        </div>
      </main>
    </SearchProvider>
  );
}
