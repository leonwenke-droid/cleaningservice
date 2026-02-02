import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const url = new URL(request.url);
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

