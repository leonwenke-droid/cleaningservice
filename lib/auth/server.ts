import { redirect } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppUserProfile } from "@/lib/auth/types";
import { defaultLocale } from "@/lib/i18n-constants";

export async function getSessionAndProfile(): Promise<{
  session: Session | null;
  profile: AppUserProfile;
}> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    // Return a typed placeholder; callers usually redirect when session is null.
    return {
      session: null,
      profile: {
        id: "",
        company_id: "",
        role: "worker",
        full_name: null,
        phone: null
      }
    };
  }

  // Get session after verifying user
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const { data: profile, error } = await supabase
    .from("app_users")
    .select("id, company_id, role, full_name, phone")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    // If a user exists in auth but isn't mapped to a company yet, redirect to onboarding
    redirect(`/${defaultLocale}/onboarding`);
  }

  return { session, profile };
}

