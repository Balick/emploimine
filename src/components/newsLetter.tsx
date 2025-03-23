"use client";

import { addUserEmail } from "@/lib/actions";
import { LoaderCircle, Mail, Send } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function NewsLetter() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // vérifier si l'email est valide à l'aide d'une expression régulière
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast("L'adresse email est invalide.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Add user email
      const message = await addUserEmail(email);
      setIsSubmitting(false);
      setEmail("");
      toast(message);
    } catch (error) {
      console.error("Erreur lors de l'abonnement à la newsletter.", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="h-[48px] relative w-[300px]">
      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isSubmitting}
        required
        placeholder="Entrez votre email"
        className="absolute inset-0 pl-10 pr-14 rounded-full text-[16px] h-full w-full border-2 focus:border-[#ffbef1] ring ring-transparent focus:ring-[#fbe8f7] hover:ring-[#fbe8f7] transition-all duration-300"
      />
      <Button
        type="submit"
        disabled={isSubmitting}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground rounded-full px-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <LoaderCircle className="w-4 h-4 text-[#ffbef1] animate-spin" />
        ) : (
          <Send className="w-4 h-4 text-[#ffbef1]" />
        )}
      </Button>
    </form>
  );
}
