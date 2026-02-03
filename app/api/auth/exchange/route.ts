import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side code exchange for magic link.
 * Uses server env vars (available at runtime on Vercel), so no client bundle key needed.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=Missing+code", request.url));
  }

  // Server-only vars so they're available at runtime on Vercel (not just at build)
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error("Exchange: missing SUPABASE_URL/SUPABASE_ANON_KEY (or NEXT_PUBLIC_*)");
    return NextResponse.redirect(new URL("/login?error=Server+config+missing", request.url));
  }

  const cookieStore: string[] = [];
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const parts = [`${name}=${value}`];
          if (options?.maxAge) parts.push(`Max-Age=${options.maxAge}`);
          if (options?.path) parts.push(`Path=${options.path}`);
          if (options?.domain) parts.push(`Domain=${options.domain}`);
          if (options?.sameSite) parts.push(`SameSite=${options.sameSite}`);
          if (options?.httpOnly) parts.push("HttpOnly");
          if (options?.secure) parts.push("Secure");
          cookieStore.push(parts.join("; "));
        });
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Exchange error:", error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  if (!data.session) {
    return NextResponse.redirect(new URL("/login?error=No+session", request.url));
  }

  // Decide redirect: onboarding if no profile, else home
  const { data: profile } = await supabase
    .from("app_users")
    .select("id, company_id")
    .eq("id", data.session.user.id)
    .single();

  const baseUrl = new URL(request.url).origin;
  const redirectTo = profile ? "/" : "/onboarding";
  const response = NextResponse.redirect(new URL(redirectTo, baseUrl));
  cookieStore.forEach((cookie) => {
    response.headers.append("Set-Cookie", cookie);
  });
  return response;
}
