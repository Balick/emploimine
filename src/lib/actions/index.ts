"use server";

import { createClient } from "@supabase/supabase-js";
import { scrapeGlencoreJobs } from "../scraper/glencore-jobs";
import { scrapeKCCJobs } from "../scraper/kcc-jobs";

// Initialiser le client Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    const { error: insertError } = await supabase
      .from("offers")
      .upsert(newJobs, { onConflict: "link" });

    if (insertError) throw insertError;

    console.log(`✅ ${newJobs.length} nouvelles offres enregistrées.`);
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
