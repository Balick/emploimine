import Aside from "@/components/aside";
import FilterButton from "@/components/FilterBtn";
import Hero from "@/components/hero";
import Offers from "@/components/offers";
import PostsSkeleton from "@/components/postsSkeleton";
import SearchBar from "@/components/searchbar";
import { SearchProvider } from "@/context/search-context";
import { Suspense } from "react";

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
