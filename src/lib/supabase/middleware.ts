import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  });

  // Skip Supabase auth - allow all requests for now (no login required)
  // TODO: Enable authentication when login system is implemented
  return supabaseResponse;
}
