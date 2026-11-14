"use client";

import { subscribe } from "@/app/actions/newsletter";
import { LoaderCircle, Mail, Send } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function NewsLetter({ id }: { id: string }) {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        const result = await subscribe(email);
        if (result.ok) {
          setEmail("");
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      } catch {
        toast.error("Impossible de vous inscrire pour le moment.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="h-[48px] relative w-[300px] max-w-full">
      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" aria-hidden />
      <Input
        id={id}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={pending}
        required
        placeholder="Entrez votre email"
        className="absolute inset-0 pl-10 pr-14 rounded-full text-[16px] h-full w-full border-2 focus:border-[#ffbef1] ring-3 ring-transparent focus:ring-[#fbe8f7] hover:ring-[#fbe8f7] transition-all duration-300"
      />
      <Button
        type="submit"
        disabled={pending}
        aria-label="S'inscrire à la newsletter"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground rounded-full px-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? (
          <LoaderCircle className="w-4 h-4 text-[#ffbef1] animate-spin" aria-hidden />
        ) : (
          <Send className="w-4 h-4 text-[#ffbef1]" aria-hidden />
        )}
      </Button>
    </form>
  );
}
