import ShareButtons from "@/components/share-buttons";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { getOffer } from "@/lib/actions/get-offers";
import { ChevronLeft } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";

export default async function Page({ params }: { params: { id: string } }) {
  noStore();
  const data = await getOffer(params.id);

  return (
    <main className="min-h-screen main py-10">
      <Link href={"/"} className="flex items-center gap-2">
        <Button className="bg-[#f8f7f4] hover:bg-[#fffdf6] text-black rounded-full flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-[13px] font-[600]">Toutes les offres</span>
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
          <ShareButtons />

          <div
            dangerouslySetInnerHTML={{ __html: data.description }}
            className="prose font-mona mt-[40px] text-[16px] font-[400] leading-[28px]"
          />
        </div>
        <Sidebar data={data} />
      </div>
    </main>
  );
}
