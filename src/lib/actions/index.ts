"use server";

import { createClient } from "@supabase/supabase-js";
import { generateEmailBody, sendEmail } from "../nodemailer";
import { scrapeGlencoreJobs } from "../scraper/glencore-jobs";
import { scrapeKCCJobs } from "../scraper/kcc-jobs";

// Initialiser le client Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function deleteExpiredOffers() {
  const today = new Date().toISOString().split("T")[0];

  try {
    // Suppression des offres avec endDate antérieur à aujourd'hui
    const { data, error } = await supabase
      .from("offers")
      .delete()
      .lt("endDate", today);

    return { data, error };
  } catch (error) {
    console.error(
      "Erreur lors de la suppression des offres expirées:",
      // @ts-expect-error - Erreur de type
      error.message
    );
  }
}

export async function scrapeAndStoreJob() {
  try {
    // Récupération des offres depuis le site
    const scrapedJobs = await scrapeGlencoreJobs();
    const kccScrapedJobs = await scrapeKCCJobs();

    const jobs = [...scrapedJobs, ...kccScrapedJobs];

    // Vérification des liens existants en base
    const { data: existingOffers, error: selectError } = await supabase
      .from("offers")
      .select("link")
      .in(
        "link",
        jobs.map((job) => job.link)
      );

    if (selectError) throw selectError;

    // Filtrage des nouvelles offres
    const existingLinks = existingOffers.map((offer) => offer.link);
    const newJobs = jobs.filter(
      (job) => job.link && !existingLinks.includes(job.link)
    );

    if (newJobs.length === 0) {
      console.log("Aucune nouvelle offre à ajouter.");
      return [];
    }

    // Insertion des nouvelles offres
    const { data: insertedJobs, error: insertError } = await supabase
      .from("offers")
      .upsert(newJobs, { onConflict: "link" })
      .select("*");

    if (insertError) throw insertError;

    console.log(`✅ ${newJobs.length} nouvelles offres enregistrées.`);

    // Récupération les adresses email
    const { data: emailsData, error: selectEmailsError } = await supabase
      .from("emails")
      .select("email");

    if (selectEmailsError) throw selectEmailsError;

    // Créer un tableau avec les adresses email
    const emails = emailsData.map((email) => email.email);

    // Envoyer les emails
    insertedJobs.forEach(async (job) => {
      const emailContent = await generateEmailBody({
        id: job.id,
        title: job.title,
        company: job.company,
        url: `https://emploimine.vercel.app/jobs/${job.id}`,
      });
      await sendEmail(emailContent, emails);
    });

    console.log("✅ Les emails ont été envoyés.");

    return newJobs;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération ou de l'enregistrement des offres:",
      error
    );
    // @ts-expect-error - Erreur de type
    throw new Error(`Échec de la mise à jour des offres: ${error.message}`);
  }
}

export async function addUserEmail(email: string) {
  try {
    // verify if email already exists in the database
    const { data, error } = await supabase
      .from("emails")
      .select("email")
      .eq("email", email);

    if (error) {
      console.error("Erreur lors de la vérification de l'email:", error);
      return "Une erreur s'est produite lors de la vérification de l'email.";
    }

    if (data.length > 0) {
      console.log("L'email est déjà inscrit.");
      return "Vous êtes déjà inscrit à la newsletter.";
    }

    // Add user email
    const { error: insertError } = await supabase
      .from("emails")
      .insert({ email });

    if (insertError) {
      console.error("Erreur lors de l'ajout de l'email:", insertError);
      return "Une erreur s'est produite lors de l'ajout de l'email.";
    }

    // send first email
    const emailContent = await generateEmailBody();
    await sendEmail(emailContent, [email]);

    return "Vous êtes inscrit à la newsletter !";
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'email à la newsletter:", error);
  }
}
