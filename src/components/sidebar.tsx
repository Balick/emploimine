import type { Offer } from "@/lib/offers";
import { CONTRACT_LABELS } from "@/lib/scraper/constants";
import { formatDate } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import CompanyLogo from "./company-logo";
import { Button } from "./ui/button";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="mt-6">
      <dt className="block font-mona font-[400] leading-[20px] text-[14px] text-[#6e6d7a]">{label}</dt>
      <dd className="block mt-2 font-mona text-base font-medium leading-[22px]">{value}</dd>
    </div>
  );
}

export default function Sidebar({ offer, open }: { offer: Offer; open: boolean }) {
  return (
    <aside className="w-full md:max-w-[336px] border border-[#e7e7e9] rounded-[8px] p-[32px] md:sticky md:top-8 self-start">
      <div className="flex flex-col items-center gap-3">
        <CompanyLogo company={offer.company} size={56} large />
        <span className="font-mona leading-[29px] font-bold text-[20px] text-center">{offer.company}</span>
        {open && (
          <Button asChild className="mt-[8px] rounded-full font-[600] text-[13px]">
            <a href={offer.url} target="_blank" rel="noopener noreferrer">
              Postuler sur le site de l&apos;offre
              <ExternalLink className="w-3.5 h-3.5" aria-hidden />
            </a>
          </Button>
        )}
      </div>

      <div className="my-8 border-t border-t-[#e7e7e9]" />

      <dl>
        <Field label="Type de contrat" value={offer.contract_type && CONTRACT_LABELS[offer.contract_type]} />
        <Field label="Lieu d'affectation" value={offer.city ?? offer.location} />
        <Field label="Date de publication" value={formatDate(offer.published_at)} />
        <Field label="Date limite de dépôt des candidatures" value={formatDate(offer.closes_at) ?? "Non précisée"} />
        <Field label="Nombre de postes" value={offer.vacancies} />
        <Field label="Niveau du poste" value={offer.level} />
      </dl>
    </aside>
  );
}
