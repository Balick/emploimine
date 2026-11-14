import Image from "next/image";
import emptyIllustration from "../../public/empty.svg";

export default function EmptyContent({ filtered = false }: { filtered?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10">
      <Image src={emptyIllustration} alt="" className="w-full max-w-[420px] h-auto" />
      <p className="text-center text-xl font-semibold">
        {filtered ? "Aucune offre ne correspond à votre recherche" : "Aucune offre disponible"}
      </p>
    </div>
  );
}
