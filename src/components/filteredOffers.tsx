"use client";

import { contrat, items } from "@/constants";
import { useSearchContext } from "@/context/search-context";
import { getElapsedTime, getLogo } from "@/lib/utils";
import { Dot, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import EmptyContent from "./empty-content";

interface HighlightedTextProps {
  text: string;
  term: string;
}

const HighlightedText: React.FC<HighlightedTextProps> = ({ text, term }) => {
  if (!term) {
    return <>{text}</>;
  }

  const parts = text.split(new RegExp(`(${term})`, "gi"));

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <span key={index} className="bg-yellow-200">
            {part}
          </span>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </>
  );
};

interface Post {
  id: string;
  title: string;
  company: string;
  type: string;
  date: string;
  endDate: string;
  city: string;
}

export default function FilteredOffers({ data }: { data: Post[] }) {
  const { term, filters } = useSearchContext();

  const filteredData = data.filter((post) => {
    // Filtre par recherche
    const matchesTerm = post.title.toLowerCase().includes(term.toLowerCase());

    // Filtre par entreprise
    const companyMatch =
      filters.companies.length === 0 ||
      items.some(
        (item) =>
          item.label === post.company && filters.companies.includes(item.id)
      );

    // Filtre par type de contrat
    const contratMatch =
      filters.contrat.length === 0 ||
      contrat.some(
        (c) =>
          c.id === post.type.toLocaleLowerCase() &&
          filters.contrat.includes(c.id)
      );

    return matchesTerm && companyMatch && contratMatch;
  });

  return filteredData.length > 0 ? (
    <ul className="flex flex-col gap-4 min-h-[646px]">
      {filteredData.map((post, index: number) => {
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
                    <HighlightedText text={post.title} term={term} />
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
