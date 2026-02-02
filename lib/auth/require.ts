import { NextResponse } from "next/server";
import type { Session } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppUserProfile } from "@/lib/auth/types";

type RequireUserResult = {
  session: Session;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
};

type RequireProfileResult = RequireUserResult & {
  profile: AppUserProfile;
};

/**
 * Requires an authenticated user. Returns 401 if not authenticated.
 */
export async function requireUser(): Promise<RequireProfileResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: profile, error } = await supabase
    .from("app_users")
    .select("id, company_id, role, full_name, phone")
    .eq("id", session.user.id)
    .single();

  if (error || !profile) {
    throw new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return { session, supabase, profile };
}

/**
 * Requires an authenticated user with a profile. Returns 401/403 if not authenticated or no profile.
 */
export async function requireProfile(): Promise<RequireProfileResult> {
  return requireUser();
}

/**
 * Requires a specific role. Returns 403 if user doesn't have the required role.
 */
export async function requireRole(
  requiredRole: "admin" | "dispatcher" | "worker"
): Promise<RequireProfileResult> {
  const { session, supabase, profile } = await requireUser();

  if (profile.role !== requiredRole) {
    throw new Response(
      JSON.stringify({ error: `Forbidden: ${requiredRole} role required` }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return { session, supabase, profile };
}

/**
 * Requires admin role. Returns 403 if user is not an admin.
 */
export async function requireAdmin(): Promise<RequireProfileResult> {
  return requireRole("admin");
}
