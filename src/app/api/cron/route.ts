import { scrapeAndStoreJob } from "@/lib/actions/index";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await scrapeAndStoreJob();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: `Scraping failed: ${error}` },
      { status: 500 }
    );
  }
}
