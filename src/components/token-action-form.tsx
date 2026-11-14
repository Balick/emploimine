"use client";

import type { NewsletterState } from "@/app/actions/newsletter";
import { Button } from "@/components/ui/button";
import { useActionState } from "react";

/**
 * Runs a newsletter action (confirm, unsubscribe) only after an explicit
 * click: mail scanners open links automatically, so acting on page load would
 * subscribe or unsubscribe people without their consent.
 */
export default function TokenActionForm({
  token,
  action,
  description,
  label,
  pendingLabel,
}: {
  token: string;
  action: (token: string) => Promise<NewsletterState>;
  description: string;
  label: string;
  pendingLabel: string;
}) {
  const [state, submit, pending] = useActionState<NewsletterState | null>(() => action(token), null);

  if (state) return <p role="status">{state.message}</p>;

  return (
    <form action={submit} className="flex flex-col items-center gap-4">
      <p>{description}</p>
      <Button type="submit" disabled={pending} className="rounded-full">
        {pending ? pendingLabel : label}
      </Button>
    </form>
  );
}
