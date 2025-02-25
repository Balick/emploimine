"use server";

//import { scrapeGlencoreJob } from "../scraper";
import { scrapeGlencoreJobs } from "../scraper/glencore-jobs";

export async function scrapeAndStoreJob() {
  try {
    const scrapedJob = await scrapeGlencoreJobs();
    return scrapedJob;
  } catch (error) {
    throw new Error(
      // @ts-expect-error - error.message is not a string
      `Erreur de création/mis à jour des données : ${error.message}`
    );
  }
}
