import { unsubscribe } from "@/app/actions/newsletter";
import { NextResponse, type NextRequest } from "next/server";

/**
 * RFC 8058 one-click unsubscribe: mail clients POST to the URL given in the
 * List-Unsubscribe header.
 */
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const result = await unsubscribe(token);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

/**
 * Older clients (RFC 2369) and people copying the header link open it with
 * GET. Never unsubscribe on GET (link scanners and prefetchers do GETs):
 * send them to the confirmation page instead.
 */
export function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const target = new URL("/desabonnement", request.nextUrl);
  if (token) target.searchParams.set("token", token);
  return NextResponse.redirect(target, 303);
}
