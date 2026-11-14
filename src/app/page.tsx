import Hero from "@/components/hero";
import OfferBrowser from "@/components/offer-browser";
import PostsSkeleton from "@/components/postsSkeleton";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Offres d'emploi dans le secteur minier en RDC",
  description:
    "Toutes les offres d'emploi des entreprises minières et de leurs sous-traitants en République démocratique du Congo, réunies au même endroit.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <main className="main pb-20">
      <Hero />
      <Suspense fallback={<PostsSkeleton />}>
        <OfferBrowser variant="open" title="Offres récentes" />
      </Suspense>
    </main>
  );
}
