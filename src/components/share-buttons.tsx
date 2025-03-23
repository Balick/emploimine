"use client";

import { ClipboardCheck, Link } from "lucide-react";
import Image from "next/image";
import React from "react";
import { Button } from "./ui/button";

export default function ShareButtons({ id }: { id: string }) {
  const url = window.location.href;
  const [isCopied, setIsCopied] = React.useState(false);

  const handleShare = (platform: string) => {
    let shareUrl = "";
    const encodedUrl = `https://emploimine.vercel.app/jobs/${id}`;
    const windowFeatures =
      "width=600,height=400,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes,status=no";

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case "x":
        shareUrl = `https://x.com/intent/tweet?url=${encodedUrl}`;
        break;
      default:
        return;
    }

    window.open(shareUrl, "_blank", windowFeatures);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 3000);
  };

  return (
    <div className="flex mt-[20px] gap-4">
      <Button
        onClick={() => handleShare("facebook")}
        className="flex items-center gap-1.5 rounded-full border-[1.5px] font-semibold whitespace-nowrap border-[#e7e7e9] bg-white text-black hover:bg-white text-[13px] h-[40px] active:scale-105 transition-all duration-300"
      >
        <Image src={"/facebook.png"} alt="Facebook" width={16} height={16} />
        <span>Partager</span>
      </Button>

      <Button
        onClick={() => handleShare("x")}
        className="flex items-center gap-1.5 rounded-full border-[1.5px] font-semibold whitespace-nowrap border-[#e7e7e9] bg-white text-black hover:bg-white text-[13px] h-[40px] active:scale-105 transition-all duration-300"
      >
        <Image src={"/x.png"} alt="X" width={16} height={16} />
        <span>Partager</span>
      </Button>

      <Button
        onClick={handleCopy}
        className="flex items-center gap-1.5 rounded-full border-[1.5px] font-semibold whitespace-nowrap border-[#e7e7e9] bg-white text-black hover:bg-white text-[13px] h-[40px] active:scale-105 transition-all duration-300"
      >
        {!isCopied ? (
          <Link className="w-4 h-4" />
        ) : (
          <ClipboardCheck className="w-4 h-4" />
        )}
        <span>{isCopied ? "Copié" : "Copier"}</span>
      </Button>
    </div>
  );
}
