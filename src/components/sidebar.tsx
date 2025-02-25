import { Job } from "@/types";
import Image from "next/image";
import { Button } from "./ui/button";

export default function Sidebar({ data }: { data: Job }) {
  return (
    <div className="w-full md:max-w-[336px] border border-[#e7e7e9] rounded-[8px] p-[32px] sticky top-8 h-[calc(100vh-64px)]">
      <div className="flex flex-col items-center justify-between">
        <div className="w-full mb-4 overflow-hidden flex items-center justify-center">
          <Image
            src={"/Glencore_logo.svg"}
            alt="Logo"
            width={150}
            height={150}
          />
        </div>
        <span className="font-mona leading-[29px] font-bold text-[24px]">
          {data.company}
        </span>
        <a href={data.link} target="_blank">
          <Button className="mt-[16px] rounded-full font-[600] text-[13px]">
            Visiter le site de l&apos;offre
          </Button>
        </a>
      </div>

      <div className="my-8 border-t border-t-[#e7e7e9]" />

      <div className="mt-6">
        <span className="block font-mona font-[400] leading-[20px] text-[14px]">
          Type de contrat
        </span>
        <span className="block mt-2 font-mona text-base font-medium leading-[22px]">
          {data.type === "CDD"
            ? "Contrat à durée déterminée (CDD)"
            : "Contrat à durée indéterminée (CDI)"}
        </span>
      </div>

      <div className="mt-6">
        <span className="block font-mona font-[400] leading-[20px] text-[14px]">
          Lieu d&apos;affectation
        </span>
        <span className="block mt-2 font-mona text-base font-medium leading-[22px]">
          {data.city}
        </span>
      </div>

      <div className="mt-6">
        <span className="block font-mona font-[400] leading-[20px] text-[14px]">
          Date limite de dépôt des candidatures
        </span>
        <span className="block mt-2 font-mona text-base font-medium leading-[22px]">
          {data.endDate}
        </span>
      </div>

      <div className="mt-6">
        <span className="block font-mona font-[400] leading-[20px] text-[14px]">
          Nombre de poste vacant
        </span>
        <span className="block mt-2 font-mona text-base font-medium leading-[22px]">
          {data.vacantPost === 0 ? 1 : data.vacantPost}
        </span>
      </div>

      <div className="mt-6">
        <span className="block font-mona font-[400] leading-[20px] text-[14px]">
          Niveau du poste
        </span>
        <span className="block mt-2 font-mona text-base font-medium leading-[22px]">
          {data.level}
        </span>
      </div>
    </div>
  );
}
