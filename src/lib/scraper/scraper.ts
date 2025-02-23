import puppeteer, { Page } from "puppeteer-core";

const URL = "https://www.glencore.com/careers/career-opportunities/africa";
const BROWSER_WS = `wss://${process.env.BRIGHT_DATA_USERNAME}:${process.env.BRIGHT_DATA_PASSWORD}@brd.superproxy.io:9222`;

export async function scrapeGlencoreJobs() {
  console.log("🚀 Connexion au navigateur...");
  const browser = await puppeteer.connect({ browserWSEndpoint: BROWSER_WS });

  try {
    console.log("🌐 Navigation vers le site...");
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });

    console.log("⏳ Attente du chargement des données...");
    await page.waitForSelector("table", { timeout: 30000 });

    console.log("🛠️ Extraction des données...");
    const jobs = await extractJobData(page);

    console.log("🔎 Filtrage des offres pour la RDC...");
    const drcJobs = jobs.filter(
      (job) =>
        job.location
          .toLowerCase()
          .includes("democratic republic of the congo") ||
        job.location.toLowerCase().includes("rdc") ||
        job.location.toLowerCase().includes("république démocratique du congo")
    );

    console.log(
      `✅ Offres en RDC extraites : ${JSON.stringify(drcJobs, null, 2)}`
    );

    return drcJobs;
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
    const jobRows = Array.from(document.querySelectorAll("tbody tr"));
    return jobRows.map((row) => {
      // Sélection des cellules dans la rangée actuelle
      const cells = row.querySelectorAll("td");
      // @ts-expect-error - Les cellules peuvent être nulles
      const [titleCell, locationCell, dateCell, endDateCell] = cells;

      const title =
        titleCell.querySelector("a span")?.textContent?.trim() || "";
      const location =
        locationCell.querySelector("a span")?.textContent?.trim() || "";
      const date = dateCell.querySelector("a span")?.textContent?.trim() || "";
      const endDate =
        endDateCell.querySelector("a span")?.textContent?.trim() || "";
      const link = titleCell.querySelector("a")?.href || "";
      // Extraction de la ville, région et pays
      const locationParts = location
        .split(",")
        .map((part: string) => part.trim());
      const city = locationParts[0] || "";
      const region = locationParts[1] || "";
      const country = locationParts[2] || "";

      return { title, location, date, endDate, link, city, region, country };
    });
  });
  return jobs;
}
