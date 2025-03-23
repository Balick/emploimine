"use server";

import { EmailContent, EmailOfferInfo } from "@/types";
import nodemailer, { SentMessageInfo } from "nodemailer";

export async function generateEmailBody(offer?: EmailOfferInfo) {
  let subject = "";
  let body = "";

  if (!offer) {
    subject = `Bienvenue sur emploimine.cd !`;
    body = `
      <div>
        <h2>Bienvenue sur emploimine !</h2>
        <p>Vous avez reçu cet email parce que vous êtes inscrit à la newsletter de l'application Emploimine.cd.</p>
        <p>Vous commencerez à recevoir des emails de nouvelles offres de travail dans le secteur minier.</p>
      </div>
    `;
  } else {
    subject = `Nouvelle offre disponible !`;
    body = `
      <div>
        <h4>Nouvelle offre disponible !</h4>
        <p>L'entreprise ${offer.company} recrute, pour le poste <b>${offer.title}</b></p>
        <p>Cliquez <a href="https://emploimine.vercel.app/jobs/${offer.id}" target="_blank" rel="noopener noreferrer">ici</a> pour voir l'offre.
        </p>
      </div>
    `;
  }

  return { subject, body };
}

const transporter = nodemailer.createTransport({
  pool: true,
  host: "smtp.hostinger.com",
  port: 465,
  auth: {
    user: "emploimine@glorious-dev.online",
    pass: process.env.EMAIL_PASSWORD,
  },
  maxConnections: 1,
});

export const sendEmail = async (
  emailContent: EmailContent,
  sendTo: string[]
) => {
  const mailOptions = {
    from: "emploimine@glorious-dev.online",
    to: sendTo,
    html: emailContent.body,
    subject: emailContent.subject,
  };

  transporter.sendMail(
    mailOptions,
    (error: Error | null, info: SentMessageInfo) => {
      if (error) return console.log(error);

      console.log("Email sent: ", info);
    }
  );
};
