"use server";

// Every export of a "use server" file is a public HTTP endpoint: keep this
// file limited to what the newsletter forms need, and validate all input.

import { sendConfirmationEmail } from "@/lib/newsletter";
import { getAdminClient } from "@/lib/supabase";
import { after } from "next/server";
import { z } from "zod";

export type NewsletterState = { ok: boolean; message: string };

const emailSchema = z.email().max(254);
const tokenSchema = z.uuid();

const GENERIC_ERROR = "Une erreur s'est produite, veuillez réessayer plus tard.";
// Same answer whether the address is new, pending or confirmed, so the form
// cannot be used to find out who is subscribed.
const CHECK_INBOX = "Vérifiez votre boîte mail : cliquez sur le lien reçu pour confirmer votre inscription.";

/** Minimum delay between two confirmation emails to the same address. */
const RESEND_DELAY_MS = 10 * 60_000;

/**
 * Create the subscriber or, if it is still pending, claim the right to resend
 * the confirmation. Returns the token to email, or null when nothing must be
 * sent (already confirmed, or an email was sent less than 10 minutes ago).
 * The claim is a single conditional UPDATE, so concurrent requests cannot
 * all pass the throttle.
 */
async function claimConfirmation(email: string): Promise<string | null> {
  const db = getAdminClient();

  const { data: created, error: insertError } = await db
    .from("subscribers")
    .insert({ email })
    .select("unsubscribe_token")
    .maybeSingle();
  if (created) return created.unsubscribe_token;
  // 23505 = unique_violation: the address already exists.
  if (insertError && insertError.code !== "23505") throw insertError;

  const { data: claimed, error: updateError } = await db
    .from("subscribers")
    .update({ confirmation_sent_at: new Date().toISOString() })
    .eq("email", email)
    .is("confirmed_at", null)
    .lt("confirmation_sent_at", new Date(Date.now() - RESEND_DELAY_MS).toISOString())
    .select("unsubscribe_token")
    .maybeSingle();
  if (updateError) throw updateError;
  return claimed?.unsubscribe_token ?? null;
}

/**
 * Register an address and send the confirmation email (double opt-in). The
 * subscriber receives offers only after clicking the link, so nobody can
 * subscribe someone else.
 *
 * The answer is the same, and returned before any database or SMTP work, for
 * new, pending and confirmed addresses: neither the message nor the response
 * time reveals who is subscribed.
 */
export async function subscribe(email: string): Promise<NewsletterState> {
  const parsed = emailSchema.safeParse(email.trim().toLowerCase());
  if (!parsed.success) return { ok: false, message: "L'adresse email est invalide." };

  after(async () => {
    try {
      const token = await claimConfirmation(parsed.data);
      if (token) await sendConfirmationEmail(parsed.data, token);
    } catch (error) {
      console.error("Inscription newsletter impossible :", error);
    }
  });

  return { ok: true, message: CHECK_INBOX };
}

export async function confirmSubscription(token: string): Promise<NewsletterState> {
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) return { ok: false, message: "Lien de confirmation invalide." };

  const { data, error } = await getAdminClient()
    .from("subscribers")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("unsubscribe_token", parsed.data)
    .is("confirmed_at", null)
    .select("id");
  if (error) {
    console.error("Confirmation impossible :", error);
    return { ok: false, message: GENERIC_ERROR };
  }
  return data.length
    ? { ok: true, message: "Inscription confirmée ! Vous recevrez les nouvelles offres par email." }
    : { ok: true, message: "Ce lien a déjà été utilisé ou a expiré." };
}

export async function unsubscribe(token: string): Promise<NewsletterState> {
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) return { ok: false, message: "Lien de désabonnement invalide." };

  const { data, error } = await getAdminClient()
    .from("subscribers")
    .delete()
    .eq("unsubscribe_token", parsed.data)
    .select("id");

  if (error) {
    console.error("Désabonnement impossible :", error);
    return { ok: false, message: GENERIC_ERROR };
  }
  return data.length
    ? { ok: true, message: "Vous êtes désabonné. Vous ne recevrez plus nos emails." }
    : { ok: true, message: "Cette adresse est déjà désabonnée." };
}
