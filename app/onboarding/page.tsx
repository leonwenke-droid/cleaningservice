import { redirect } from "next/navigation";

import { TopBar } from "@/components/TopBar";
import { CreateCompanyForm } from "@/components/onboarding/CreateCompanyForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Check if user already has a company
  const { data: profile } = await supabase
    .from("app_users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (profile) {
    // User already has a company, redirect to dashboard
    redirect("/");
  }

  return (
    <>
      <TopBar title="Welcome" />
      <main className="container">
        <div className="card">
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Create Your Company</div>
          <div className="muted" style={{ marginBottom: 16 }}>
            You need to create a company to get started. You'll be the administrator.
          </div>
          <CreateCompanyForm userEmail={user.email || ""} />
        </div>
      </main>
    </>
  );
}
