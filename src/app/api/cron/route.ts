import { deleteExpiredOffers, scrapeAndStoreJob } from "@/lib/actions/index";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await scrapeAndStoreJob();
    await deleteExpiredOffers();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: `Operation failed: ${error}` },
      { status: 500 }
    );
  }
}
