import Image from "next/image";
import emptyIllustration from "../../public/empty.svg";

export default function EmptyContent() {
  return (
    <div className="w-full h-[646px] overflow-hidden relative">
      <Image src={emptyIllustration} alt="empty illustration" fill />
      <p className="text-center text-xl font-semibold">
        Aucune offre disponible
      </p>
    </div>
  );
}
