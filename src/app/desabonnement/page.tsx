import { unsubscribe } from "@/app/actions/newsletter";
import TokenActionForm from "@/components/token-action-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Se désabonner",
  robots: { index: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="main py-24 flex flex-col items-center gap-6 text-center">
      <h1 className="font-mona font-bold text-2xl">Se désabonner de la newsletter</h1>
      {token ? (
        <TokenActionForm
          token={token}
          action={unsubscribe}
          description="Vous ne recevrez plus d'emails à propos des nouvelles offres."
          label="Confirmer le désabonnement"
          pendingLabel="Désabonnement…"
        />
      ) : (
        <p>Ce lien est incomplet. Utilisez le lien présent en bas de nos emails.</p>
      )}
    </main>
  );
}
