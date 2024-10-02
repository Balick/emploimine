import Image from "next/image";
import { Button } from "./ui/button";

export default function Sidebar() {
  return (
    <div className="w-full md:max-w-[336px] border border-[#e7e7e9] rounded-[8px] p-[32px]">
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
          Glencore
        </span>
        <a
          href={
            "https://glencorejobs.nga.net.au/cp/index.cfm?event=jobs.checkJobDetailsNewApplication&returnToEvent=jobs.listJobs&jobid=005795B0-F16A-4D61-9E59-B1E301498D0A&CurATC=Africa&CurBID=0F32712B%2DBC67%2D4CD9%2D988D%2D9DB401357A6D&JobListID=22FC4F47%2DE994%2D46A3%2DB8C9%2D9BC901269F43&jobsListKey=ab730e34%2D46a5%2D4eb7%2D81c8%2D674345fb39b1&persistVariables=CurATC,CurBID,JobListID,jobsListKey,JobID&lid=51632810038&rmuh=2DCB20B6BD826484BE54615CEEADC2DA49C26AD6"
          }
          target="_blank"
        >
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
          Contrat à durée déterminée (CDD)
        </span>
      </div>

      <div className="mt-6">
        <span className="block font-mona font-[400] leading-[20px] text-[14px]">
          Lieu d&apos;affectation
        </span>
        <span className="block mt-2 font-mona text-base font-medium leading-[22px]">
          Kolwezi
        </span>
      </div>

      <div className="mt-6">
        <span className="block font-mona font-[400] leading-[20px] text-[14px]">
          Date limite de dépôt des candidatures
        </span>
        <span className="block mt-2 font-mona text-base font-medium leading-[22px]">
          24 Sept 2024
        </span>
      </div>

      <div className="mt-6">
        <span className="block font-mona font-[400] leading-[20px] text-[14px]">
          Nombre de poste vacant
        </span>
        <span className="block mt-2 font-mona text-base font-medium leading-[22px]">
          1
        </span>
      </div>

      <div className="mt-6">
        <span className="block font-mona font-[400] leading-[20px] text-[14px]">
          Niveau du poste
        </span>
        <span className="block mt-2 font-mona text-base font-medium leading-[22px]">
          Maitrise
        </span>
      </div>
    </div>
  );
}
