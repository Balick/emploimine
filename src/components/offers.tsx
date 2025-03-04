import { getOffers } from "@/lib/actions/get-offers";
import { getElapsedTime, getLogo } from "@/lib/utils";
import { Dot, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import EmptyContent from "./empty-content";

export default async function Offers({ query }: { query: string }) {
  const data = await getOffers(query);

  return data.length > 0 ? (
    <ul className="flex flex-col gap-4 min-h-[646px]">
      {data.map((post, index) => {
        const company = post.company.toLowerCase();
        const logo = getLogo(company);

        return (
          <li
            key={index}
            className="hover:bg-[#fefbfe] py-5 px-[10px] border border-[#f1f1f1] rounded-lg hover:shadow-sm transition-all duration-300"
          >
            <Link
              href={`/jobs/${post.id}`}
              className="flex items-center gap-2 justify-between"
            >
              <div className="flex items-center w-[100%] md:w-[75%]">
                <div className="w-[46px] h-[46px] rounded-[4px] mr-4 relative overflow-hidden flex-none">
                  <Image src={logo} alt="Logo" fill objectFit="cover" />
                </div>
                <div className="flex flex-col gap-1.5 overflow-hidden">
                  <span>{post.company}</span>
                  <h4 className="leading-[13px] font-semibold text-nowrap truncate overflow-hidden h-5">
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
                  Posté {getElapsedTime(post.date)}
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
        );
      })}
    </ul>
  ) : (
    <EmptyContent />
  );
}
