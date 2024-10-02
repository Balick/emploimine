import Hero from "@/components/hero";
import SearchBar from "@/components/searchbar";
import Posts from "@/components/posts";
import Aside from "@/components/aside";

export default function Home() {
  return (
    <main className="main pb-20">
      <Hero />
      <div>
        <Aside />
        <div className="lg:w-[65%] top-0">
          <SearchBar />
          <Posts />
        </div>
      </div>
    </main>
  );
}
