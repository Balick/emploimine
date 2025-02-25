import { NextResponse } from "next/server";
import { scrapeAndStoreJob } from "@/lib/actions/index";

export async function GET() {
  try {
    await scrapeAndStoreJob();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Scraping failed" }, { status: 500 });
  }
}
