import { websitesToScrape } from "@/constants";
import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapeGlencoreJob() {
  const url = websitesToScrape[0].url;

  // BrightData proxy configuration
  const username = String(process.env.BRIGHT_DATA_USERNAME);
  const password = String(process.env.BRIGHT_DATA_PASSWORD);
  const port = 22225;
  const session_id = (1000000 * Math.random()) | 0;

  const options = {
    auth: {
      username: `${username}-session-${session_id}`,
      password,
    },
    host: "brd.superproxy.io",
    port,
    rejectUnauthorized: false,
  };

  try {
    // Fetch the product page
    const response = await axios.get(url, options);
    const $ = cheerio.load(response.data);

    // Construct data object with scraped information
    const links = $.extract({
      link: [
        {
          selector: "a.cp_jobListJobTitle",
          value: "href",
        },
      ],
    });

    let responseData;
    if (links.link.length > 0) {
      responseData = await Promise.all(
        links.link.map(async (link) => {
          const response = await axios.get(
            `https://glencorejobs.nga.net.au/cp/${link}`,
            options
          );
          const $ = cheerio.load(response.data);

          return {
            title: $("h1").text(),
            description: $("div.cp_content p").html(),
            link: link,
          };
        })
      );
    }

    return responseData;
  } catch (error) {
    console.log(error);
  }
}

export async function scrapeGlencoreJobItem(url: string) {
  // BrightData proxy configuration
  const username = String(process.env.BRIGHT_DATA_USERNAME);
  const password = String(process.env.BRIGHT_DATA_PASSWORD);
  const port = 22225;
  const session_id = (1000000 * Math.random()) | 0;

  const options = {
    auth: {
      username: `${username}-session-${session_id}`,
      password,
    },
    host: "brd.superproxy.io",
    port,
    rejectUnauthorized: false,
  };

  try {
    // Fetch the product page
    const response = await axios.get(
      `https://glencorejobs.nga.net.au/cp/${url}`,
      options
    );
    const $ = cheerio.load(response.data);
    const title = $("h1").text();
    const description = $("div.cp_content p").html();
    console.log(description);

    return {
      title,
      description,
    };
  } catch (error) {
    console.log(error);
  }
}
