"use client";

import { ClipboardCheck, Link as LinkIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "./ui/button";

const buttonClass =
  "flex items-center gap-1.5 rounded-full border-[1.5px] font-semibold whitespace-nowrap border-[#e7e7e9] bg-white text-black hover:bg-white text-[13px] h-[40px] active:scale-105 transition-all duration-300";

export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [isCopied, setIsCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);

  const share = (shareUrl: string) =>
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=400");

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  return (
    <div className="flex flex-wrap mt-[20px] gap-4">
      <Button
        onClick={() => share(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}
        className={buttonClass}
        aria-label="Partager sur Facebook"
      >
        <Image src="/facebook.png" alt="" width={16} height={16} />
        <span>Partager</span>
      </Button>

      <Button
        onClick={() =>
          share(`https://x.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(title)}`)
        }
        className={buttonClass}
        aria-label="Partager sur X"
      >
        <Image src="/x.png" alt="" width={16} height={16} />
        <span>Partager</span>
      </Button>

      <Button
        onClick={() => share(`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`)}
        className={buttonClass}
        aria-label="Partager sur WhatsApp"
      >
        <span>WhatsApp</span>
      </Button>

      <Button onClick={copy} className={buttonClass}>
        {isCopied ? <ClipboardCheck className="w-4 h-4" aria-hidden /> : <LinkIcon className="w-4 h-4" aria-hidden />}
        <span>{isCopied ? "Copié" : "Copier le lien"}</span>
      </Button>
    </div>
  );
}
