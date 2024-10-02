"use client";

import React from "react";
import { Button } from "./ui/button";
import { Link, ClipboardCheck } from "lucide-react";
import Image from "next/image";

export default function ShareButtons() {
  const url = window.location.href;
  const [isCopied, setIsCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 10000);
  };

  return (
    <div className="flex mt-[20px] gap-4">
      <a href="#" target="_blank" rel="noreferrer">
        <Button className="flex items-center gap-1.5 rounded-full border-[1.5px] font-semibold whitespace-nowrap border-[#e7e7e9] bg-white text-black hover:bg-white text-[13px] h-[40px] active:scale-105 transition-all duration-300">
          <Image src={"/facebook.png"} alt="Facebook" width={16} height={16} />
          <span>Partager</span>
        </Button>
      </a>

      <a href="#" target="_blank" rel="noreferrer">
        <Button className="flex items-center gap-1.5 rounded-full border-[1.5px] font-semibold whitespace-nowrap border-[#e7e7e9] bg-white text-black hover:bg-white text-[13px] h-[40px] active:scale-105 transition-all duration-300">
          <Image src={"/x.png"} alt="x" width={16} height={16} />
          <span>Partager</span>
        </Button>
      </a>

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
