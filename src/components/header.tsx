import Link from "next/link";
import { Input } from "./ui/input";
import { Send, Mail } from "lucide-react";
import { Button } from "./ui/button";

export default function Header() {
  return (
    <div className="main pt-4 flex items-center justify-between">
      <Link href={"/"} className="text-lg md:text-xl">
        EmploisMinesRDC.cd
      </Link>
      <div className="hidden md:flex items-center gap-4">
        <label htmlFor="newsletter">
          Resté informé{" "}
          <span className="hidden lg:inline">des nouvelles offres</span>
        </label>
        <form className="h-[48px] relative w-[300px]">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Entrez votre email"
            className="absolute inset-0 pl-10 pr-14 rounded-full text-[16px] h-full w-full border-2 focus:border-[#ffbef1] ring ring-transparent focus:ring-[#fbe8f7] hover:ring-[#fbe8f7] transition-all duration-300"
          />
          <Button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground rounded-full px-3">
            <Send className="w-4 h-4 text-[#ffbef1]" />
          </Button>
        </form>
      </div>
    </div>
  );
}
