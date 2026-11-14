import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { getOffer } from "@/lib/actions/get-offers";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getOffer(id);

  const formattedDate = new Date(data.endDate).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return {
    title: `${data.title} - ${data.company} | EmploiMine`,
    description: `Poste de ${data.title} chez ${data.company}. Offre à pourvoir avant le ${formattedDate}`,
    openGraph: {
      title: `${data.title} - ${data.company} | EmploiMine`,
      description: `Poste de ${data.title} chez ${data.company}. Offre à pourvoir avant le ${formattedDate}`,
      type: "website",
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/jobs/${id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${data.title} - ${data.company} | EmploiMine`,
      description: `Poste de ${data.title} chez ${data.company}. Offre à pourvoir avant le ${formattedDate}`,
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const data = await getOffer(id);

  return (
    <main className="min-h-screen main py-10">
      <Link href={"/history"} className="flex items-center gap-2">
        <Button className="bg-[#f8f7f4] hover:bg-[#fffdf6] text-black rounded-full flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-[13px] font-[600]">
            Toutes les anciennes offres
          </span>
        </Button>
      </Link>
      <div className="mt-[32px] max-w-[1152px] mx-auto flex flex-col md:flex-row gap-[60px]">
        <div className="grow">
          <span className="block font-mona leading-[22px] text-[16px] font-medium">
            Détails de l&apos;offre
          </span>
          <h1 className="leading-[29px] md:leading-[38px] font-bold text-[24px] md:text-[32px] font-mona">
            {data.title}
          </h1>

          <div
            dangerouslySetInnerHTML={{ __html: data.description }}
            className="prose font-mona mt-[40px] text-[16px] font-[400] leading-[28px]"
          />
        </div>
        <Sidebar isOld data={data} />
      </div>
    </main>
  );
}
