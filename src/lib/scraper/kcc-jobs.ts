import { Job } from "@/types";
import pLimit from "p-limit";
import puppeteer, { Browser, Page } from "puppeteer-core";

const URL =
  "https://careers.glencorecopper.com/KCC/go/KAMOTO-COPPER-COMPANY-S_A-Page/9302555/";
const BROWSER_WS = `wss://${process.env.BRIGHT_DATA_USERNAME}:${process.env.BRIGHT_DATA_PASSWORD}@brd.superproxy.io:9222`;

export async function scrapeKCCJobs() {
  console.log("🚀 Connexion au navigateur...");
  const browser = await puppeteer.connect({ browserWSEndpoint: BROWSER_WS });

  try {
    console.log("🌐 Navigation vers le site...");
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });

    console.log("⏳ Attente du chargement des données...");
    await page.waitForSelector("#searchresults tbody", { timeout: 30000 });

    console.log("🛠️ Extraction des données...");
    const jobs = await extractJobData(page);

    console.log("📝 Extraction des détails de chaque offre...");
    const detailedJobs = await getJobDetails(browser, jobs);

    console.log(
      `✅ Offres détaillées extraites : ${JSON.stringify(
        detailedJobs,
        null,
        2
      )}`
    );

    return detailedJobs;
  } catch (error) {
    console.error("❌ Une erreur s'est produite lors du scraping :", error);
    throw error; // Rélève l'erreur pour que la fonction appelante puisse la gérer
  } finally {
    await browser.close();
    console.log("👋 Navigateur fermé.");
  }
}

async function extractJobData(page: Page) {
  // Cette fonction extrait les données des offres d'emploi
  const jobs = await page.evaluate(() => {
    const jobRows = Array.from(document.querySelectorAll(".data-row"));
    return jobRows.map((row) => {
      // Sélection des cellules dans la rangée actuelle
      const cells = row.querySelectorAll("td");
      // @ts-expect-error - Les cellules peuvent être nulles
      const [titleCell, locationCell, dateCell] = cells;

      const title =
        titleCell.querySelector("span.jobTitle")?.textContent?.trim() || "";
      const location =
        locationCell.querySelector("span.jobLocation")?.textContent?.trim() ||
        "";
      const date =
        new Date(
          dateCell.querySelector("span.jobDate")?.textContent?.trim()
        ).toLocaleDateString() || "";

      const link = titleCell.querySelector("a")?.href || "";
      // Extraction de la ville, région et pays
      const locationParts = location
        .split(",")
        .map((part: string) => part.trim());
      const city = locationParts[0] || "";

      return {
        title,
        location,
        date,
        endDate: "",
        link,
        city,
        region: "-",
        country: "république démocratique du congo",
        company: "KAMOTO Copper Company",
        type: "CDI",
        description: "",
        vacantPost: 0,
        level: "-",
      };
    });
  });
  return jobs;
}

async function getJobDetails(browser: Browser, jobs: Job[]): Promise<Job[]> {
  // Limite le nombre de pages ouvertes simultanément
  const limit = pLimit(5); // Ajuste ce nombre en fonction de tes ressources

  const promises = jobs.map((job) =>
    limit(async () => {
      try {
        const page = await browser.newPage();
        await page.goto(job.link, {
          waitUntil: "networkidle2",
          timeout: 60000,
        });

        // Attente du chargement de la description
        await page.waitForSelector("div.job", {
          timeout: 30000,
        });

        // Extraction de la description du poste
        const description = await page.evaluate(() => {
          return document.querySelector("span.jobdescription")?.innerHTML || "";
        });

        await page.close(); // Ferme la page pour libérer les ressources

        job.description = description;

        return job;
      } catch (error) {
        console.error(
          `⚠️ Erreur lors de l'extraction des détails pour ${job.title}:`,
          error
        );
        return job; // Retourne le job sans la description en cas d'erreur
      }
    })
  );

  // Attend que toutes les promesses soient résolues
  const detailedJobs = await Promise.all(promises);

  return detailedJobs;
}
