import { ListFilter } from "lucide-react";
import { Suspense } from "react";
import Offers from "./offers";
import PostsSkeleton from "./postsSkeleton";
import { Button } from "./ui/button";

export default async function Posts() {
  return (
    <section>
      <div className="flex items-center justify-between my-[40px]">
        <h1 className="font-mona font-bold leading-[24px] text-lg">
          Offres récentes
        </h1>
        <Button
          variant="ghost"
          className="border-[1.5px] border-[#e7e7e9] rounded-full leading-4 flex items-center justify-center gap-1 lg:hidden"
        >
          <ListFilter className="w-4 h-4" />
          Filtrer
        </Button>
      </div>
      <Suspense fallback={<PostsSkeleton />}>
        <Offers />
      </Suspense>
    </section>
  );
}
