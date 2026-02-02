import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";

async function getAllCookiesCompat(): Promise<{ name: string; value: string }[]> {
  const cookieStore: any = await cookies();

  // Newer Next.js versions support getAll()
  if (typeof cookieStore?.getAll === "function") {
    return cookieStore.getAll();
  }

  // Fallback for older Next.js: parse the Cookie header
  const headerStore: any = await headers();
  const cookieHeader = headerStore?.get?.("cookie") ?? "";
  if (!cookieHeader) return [];

  return cookieHeader
    .split(";")
    .map((part: string) => part.trim())
    .filter(Boolean)
    .map((pair: string) => {
      const idx = pair.indexOf("=");
      if (idx === -1) return { name: pair, value: "" };
      return { name: pair.slice(0, idx), value: pair.slice(idx + 1) };
    });
}

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  const cookieStore: any = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return getAllCookiesCompat();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components can't set cookies; middleware handles refresh.
        }
      }
    }
  });
}

