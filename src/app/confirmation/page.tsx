import { confirmSubscription } from "@/app/actions/newsletter";
import TokenActionForm from "@/components/token-action-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confirmer l'inscription",
  robots: { index: false },
};

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="main py-24 flex flex-col items-center gap-6 text-center">
      <h1 className="font-mona font-bold text-2xl">Confirmer votre inscription</h1>
      {token ? (
        <TokenActionForm
          token={token}
          action={confirmSubscription}
          description="Recevez par email les nouvelles offres d'emploi du secteur minier en RDC."
          label="Confirmer mon inscription"
          pendingLabel="Confirmation…"
        />
      ) : (
        <p>Ce lien est incomplet. Utilisez le lien présent dans l&apos;email de confirmation.</p>
      )}
    </main>
  );
}
