import OfferBrowser from "@/components/offer-browser";
import PostsSkeleton from "@/components/postsSkeleton";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Historique des offres d'emploi",
  description:
    "Les offres d'emploi du secteur minier en RDC qui ne sont plus disponibles : utile pour connaître les entreprises qui recrutent et les profils recherchés.",
  alternates: { canonical: "/history" },
};

export default function History() {
  return (
    <main className="main pb-20 py-14">
      <Suspense fallback={<PostsSkeleton />}>
        <OfferBrowser variant="past" title="Historique des offres d'emploi" headingLevel="h1" />
      </Suspense>
    </main>
  );
}
