import {Job} from "@/types";
import {formatDateKCCJobDate} from "@/lib/utils";
import puppeteer, {Browser, Page} from "puppeteer-core";

const URL =
  "https://careers.glencorecopper.com/KCC/go/KAMOTO-COPPER-COMPANY-S_A-Page/9302555/";
const BROWSER_WS = `wss://${process.env.BRIGHT_DATA_USERNAME}:${process.env.BRIGHT_DATA_PASSWORD}@brd.superproxy.io:9222`;

async function extractJobData(page: Page) {
  // Extraction des données des offres d'emploi côté navigateur (sans formater la date)
  return await page.evaluate(() => {
    const jobRows = Array.from(document.querySelectorAll(".data-row"));
    return jobRows.map((row) => {
      const cells = row.querySelectorAll("td");
      const [titleCell, locationCell, dateCell] = cells;

      const title = titleCell.querySelector("span.jobTitle")?.textContent?.trim() || "";
      const location = locationCell.querySelector("span.jobLocation")?.textContent?.trim() || "";
      // On extrait la date brute sans appel à formatDateKCCJobDate
      const date = dateCell.querySelector("span.jobDate")?.textContent?.trim() || "";
      const link = titleCell.querySelector("a")?.href || "";

      return {
        title,
        location,
        date, // Date brute
        endDate: "",
        link,
        city: "-",
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
}

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
    // Extraction des jobs avec les dates brutes
    const rawJobs = await extractJobData(page);
    // Formatage de la date côté Node
    const jobs = rawJobs.map(job => ({
      ...job,
      date: formatDateKCCJobDate(job.date)
    }));

    console.log("📝 Extraction des détails de chaque offre...");
    const detailedJobs = await getJobDetails(jobs);

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
    throw error;
  } finally {
    await browser.close();
    console.log("👋 Navigateur fermé.");
  }
}

async function getJobDetails(jobs: Job[]): Promise<Job[]> {
  return await Promise.all(
    jobs.map(async (job) => {
      let browser: Browser | null = null;
      let page: Page | null = null;
      try {
        // Nouvelle connexion pour chaque job
        browser = await puppeteer.connect({ browserWSEndpoint: BROWSER_WS });
        page = await browser.newPage();

        await page.goto(job.link, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForSelector('div.job', { timeout: 30000 });

        // Extraction de la description dans le navigateur
        job.description = await page.evaluate(() => {
          return document.querySelector('span.jobdescription')?.innerHTML || "";
        });
        // Extraction de la date brute pour endDate
        const rawEndDate = await page.evaluate(() => {
          return document.querySelector('.job > div:nth-child(3) span:last-child')?.innerHTML.trim() || "";
        });
        job.endDate = rawEndDate;
        // Extraction de la ville
        job.city = await page.evaluate(() => {
          return document.querySelector('.job > div:nth-child(5) span:last-child')?.innerHTML.trim() || "";
        });

        // Formatage de endDate côté Node
        return { ...job, endDate: formatDateKCCJobDate(job.endDate) };
      } catch (error) {
        console.error(`⚠️ Erreur lors de l'extraction des détails pour ${job.title}:`, error);
        return job;
      } finally {
        if (page) await page.close();
        if (browser) await browser.close();
      }
    })
  );
}
