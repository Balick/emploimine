import Hero from "@/components/hero";
import SearchBar from "@/components/searchbar";
import Posts from "@/components/posts";
import Aside from "@/components/aside";

export default async function Home(props: {
  searchParams?: Promise<{
    query?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams?.query || "";

  return (
    <main className="main pb-20">
      <Hero />
      <div>
        <Aside />
        <div className="lg:w-[65%] top-0">
          <SearchBar />
          <Posts query={query} />
        </div>
      </div>
    </main>
  );
}
