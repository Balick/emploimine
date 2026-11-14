import nodemailer, { type Transporter } from "nodemailer";
import pLimit from "p-limit";
import { isOpen, today } from "@/lib/dates";
import { selectAll } from "@/lib/scraper/store";
import { getAdminClient } from "@/lib/supabase";
import { SITE_URL } from "@/lib/site";

type DigestOffer = {
  id: string;
  title: string;
  company: string;
  city: string | null;
  closes_at: string | null;
  removed_at: string | null;
};

/* -------------------------------------------------------------------------- */
/*                                  Transport                                 */
/* -------------------------------------------------------------------------- */

let transporter: Transporter | null | undefined;

/** SMTP transport from env vars, or `null` when email is not configured. */
function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    console.warn("SMTP non configuré (SMTP_HOST/SMTP_USER/SMTP_PASSWORD) : aucun email envoyé.");
    return (transporter = null);
  }
  const port = Number(SMTP_PORT ?? 465);
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    pool: true,
    maxConnections: 1,
  });
  return transporter;
}

const from = () => process.env.EMAIL_FROM ?? `EmploiMine <${process.env.SMTP_USER}>`;

/* -------------------------------------------------------------------------- */
/*                                  Templates                                 */
/* -------------------------------------------------------------------------- */

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const unsubscribeUrl = (token: string) => `${SITE_URL}/desabonnement?token=${token}`;

function layout(content: string, token: string) {
  return `<!doctype html>
<html lang="fr">
  <body style="font-family: Arial, Helvetica, sans-serif; color: #0d0c22; max-width: 600px; margin: 0 auto; padding: 24px;">
    ${content}
    <hr style="border: none; border-top: 1px solid #e7e7e9; margin: 32px 0 16px;" />
    <p style="font-size: 12px; color: #6e6d7a;">
      Vous recevez cet email car vous êtes inscrit à la newsletter d'EmploiMine.
      <a href="${unsubscribeUrl(token)}" style="color: #6e6d7a;">Se désabonner</a>
    </p>
  </body>
</html>`;
}

function confirmationEmail(token: string) {
  const confirmUrl = `${SITE_URL}/confirmation?token=${token}`;
  return {
    subject: "Confirmez votre inscription à EmploiMine",
    html: layout(
      `<h2>Bienvenue sur EmploiMine !</h2>
       <p>Pour recevoir les nouvelles offres d'emploi du secteur minier en RDC, confirmez votre adresse :</p>
       <p><a href="${confirmUrl}" style="display: inline-block; background: #0d0c22; color: #fff; padding: 12px 20px; border-radius: 999px; text-decoration: none;">Confirmer mon inscription</a></p>
       <p style="font-size: 14px; color: #6e6d7a;">Vous n'avez rien demandé ? Ignorez cet email : vous ne recevrez rien d'autre.</p>`,
      token
    ),
  };
}

function digestEmail(offers: DigestOffer[], token: string) {
  const items = offers
    .map((offer) => {
      const details = [offer.company, offer.city].filter(Boolean).map((v) => escapeHtml(v!)).join(" · ");
      const deadline = offer.closes_at
        ? ` · avant le ${new Date(offer.closes_at).toLocaleDateString("fr-FR", { dateStyle: "long", timeZone: "UTC" })}`
        : "";
      return `<li style="margin-bottom: 12px;">
        <a href="${SITE_URL}/jobs/${offer.id}" style="font-weight: bold; color: #0d0c22;">${escapeHtml(offer.title)}</a><br />
        <span style="color: #6e6d7a; font-size: 14px;">${details}${deadline}</span>
      </li>`;
    })
    .join("");

  const count = offers.length;
  return {
    subject:
      count === 1
        ? `Nouvelle offre : ${offers[0].title} (${offers[0].company})`
        : `${count} nouvelles offres d'emploi dans les mines en RDC`,
    html: layout(
      `<h2>${count === 1 ? "Une nouvelle offre est disponible" : `${count} nouvelles offres sont disponibles`}</h2>
       <ul style="padding-left: 18px;">${items}</ul>
       <p><a href="${SITE_URL}">Voir toutes les offres</a></p>`,
      token
    ),
  };
}

/* -------------------------------------------------------------------------- */
/*                                   Sending                                  */
/* -------------------------------------------------------------------------- */

async function send(to: string, token: string, { subject, html }: { subject: string; html: string }) {
  const transport = getTransporter();
  if (!transport) return;
  await transport.sendMail({
    from: from(),
    to, // one recipient per email: subscribers never see each other's address
    subject,
    html,
    headers: {
      "List-Unsubscribe": `<${SITE_URL}/api/unsubscribe?token=${token}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}

/** Double opt-in: nothing else is sent until the link in this email is clicked. */
export async function sendConfirmationEmail(email: string, token: string) {
  await send(email, token, confirmationEmail(token));
}

async function markNotified(ids: string[]) {
  const db = getAdminClient();
  const now = new Date().toISOString();
  for (let i = 0; i < ids.length; i += 100) {
    const { error } = await db.from("offers").update({ notified_at: now }).in("id", ids.slice(i, i + 100));
    if (error) throw error;
  }
}

/**
 * Email the offers nobody has been told about yet (`notified_at` is null) to
 * every confirmed subscriber, in one digest, then mark them as notified.
 *
 * - Offers already closed are marked without being sent.
 * - If every email fails (SMTP down), nothing is marked: the next run retries.
 * - Without SMTP configuration the backlog is marked, so that configuring
 *   email later does not send months of old offers at once.
 */
export async function sendPendingOffers() {
  const db = getAdminClient();
  const pending = await selectAll<DigestOffer>((from, to) =>
    db
      .from("offers")
      .select("id, title, company, city, closes_at, removed_at")
      .is("notified_at", null)
      .order("first_seen_at")
      .range(from, to)
  );
  if (!pending.length) return;

  const day = today();
  const fresh = pending.filter((offer) => isOpen(offer, day));
  const stale = pending.filter((offer) => !isOpen(offer, day));
  await markNotified(stale.map((offer) => offer.id));
  if (!fresh.length) return;

  const transport = getTransporter();
  if (!transport) {
    await markNotified(fresh.map((offer) => offer.id));
    return;
  }

  const subscribers = await selectAll<{ email: string; unsubscribe_token: string }>((from, to) =>
    db
      .from("subscribers")
      .select("email, unsubscribe_token")
      .not("confirmed_at", "is", null)
      .order("id")
      .range(from, to)
  );

  const limit = pLimit(2);
  const results = await Promise.allSettled(
    subscribers.map((subscriber) =>
      limit(() => send(subscriber.email, subscriber.unsubscribe_token, digestEmail(fresh, subscriber.unsubscribe_token)))
    )
  );
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  console.error(
    `Newsletter : ${fresh.length} offre(s), ${results.length - failed.length}/${results.length} email(s) envoyé(s).`
  );
  for (const failure of failed.slice(0, 5)) console.error(failure.reason);
  // Release the pooled SMTP connection so the scraper process can exit.
  transport.close();
  transporter = undefined;

  if (subscribers.length && failed.length === subscribers.length) {
    throw new Error("Aucun email n'a pu être envoyé : les offres seront renvoyées à la prochaine exécution.");
  }
  await markNotified(fresh.map((offer) => offer.id));
}
