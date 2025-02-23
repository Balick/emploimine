import { scrapeAndStoreJob } from "@/lib/actions";
import { Dot, ListFilter, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import EmptyContent from "./empty-content";
import { Button } from "./ui/button";

export default async function Posts() {
  const data = await scrapeAndStoreJob();

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
      {data ? (
        <ul className="flex flex-col gap-4 min-h-[646px]">
          {data.map((post, index) => (
            <li
              key={index}
              className="hover:bg-[#fefbfe] py-5 px-[10px] border border-[#f1f1f1] rounded-lg hover:shadow-sm transition-all duration-300"
            >
              <Link
                href={`/jobs/ingenieur-en-securite-des-procedes`}
                className="flex items-center gap-2 justify-between"
              >
                <div className="flex items-center w-[100%] md:w-[75%]">
                  <div className="w-[46px] h-[46px] rounded-[4px] mr-4 relative overflow-hidden flex-none">
                    <Image
                      src={"/glencore.webp"}
                      alt="Logo"
                      fill
                      objectFit="cover"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 overflow-hidden">
                    <span>Glencore</span>
                    <h4 className="leading-[13px] font-semibold text-nowrap truncate overflow-hidden">
                      {post.title}
                    </h4>
                    <div className="flex items-center gap-0.5">
                      <span>CDI</span>
                      <Dot className="w-5 h-5" />
                      <span className="hidden md:block">
                        {post.date} - {post.endDate}
                      </span>
                      <span className="md:hidden">{post.city}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex flex-col justify-between items-end gap-[20px] w-max flex-none">
                  <span className="text-[#6e6d7a] text-sm">
                    Posté il y a 2 jours
                  </span>
                  <div className="items-center gap-1 flex ">
                    <MapPin className="w-3 h-3" />
                    <span className="font-bold text-xs text-nowrap text-ellipsis">
                      {post.city}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyContent />
      )}
    </section>
  );
}
