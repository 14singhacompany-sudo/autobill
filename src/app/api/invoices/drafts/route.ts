import { NextResponse } from "next/server";
import { createBotDraftInvoice } from "@/lib/bot-draft-invoice";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const raw = await request.text();
  let body: unknown = raw;

  if (!contentType.includes("text/plain")) {
    if (!raw.trim()) {
      body = {};
    } else {
      try {
        body = JSON.parse(raw);
      } catch {
        if (contentType.includes("json")) {
          return NextResponse.json({ error: "Request body is not valid JSON" }, { status: 400 });
        }
        body = raw;
      }
    }
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    console.error("Bot draft API is missing the service role client", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Server is not configured for draft invoices" }, { status: 500 });
  }

  let origin = "";
  try {
    origin = new URL(request.url).origin;
  } catch {
    origin = "";
  }

  const result = await createBotDraftInvoice({
    authorization: request.headers.get("authorization"),
    body,
  }, {
    supabase,
    env: {
      AUTOBILL_BOT_API_KEY: process.env.AUTOBILL_BOT_API_KEY,
      AUTOBILL_BOT_COMPANY_ID: process.env.AUTOBILL_BOT_COMPANY_ID,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    },
    origin,
  });

  return NextResponse.json(result.body, { status: result.status });
}
