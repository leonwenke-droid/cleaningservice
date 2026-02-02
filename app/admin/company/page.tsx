import Link from "next/link";
import { redirect } from "next/navigation";

import { TopBar } from "@/components/TopBar";
import { getSessionAndProfile } from "@/lib/auth/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanySettingsForm } from "@/components/admin/CompanySettingsForm";

export default async function AdminCompanyPage() {
  const { session, profile } = await getSessionAndProfile();
  if (!session) redirect("/login");

  if (profile.role !== "admin") {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();
  const { data: company, error } = await supabase
    .from("companies")
    .select("id, name, created_at")
    .eq("id", profile.company_id)
    .single();

  if (error || !company) {
    return (
      <>
        <TopBar
          title="Company Settings"
          right={
            <Link className="pill" href="/">
              Home
            </Link>
          }
        />
        <main className="container">
          <div className="card">
            <div style={{ fontWeight: 900 }}>Error</div>
            <div className="muted">{error?.message || "Company not found"}</div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Company Settings"
        right={
          <Link className="pill" href="/">
            Home
          </Link>
        }
      />
      <main className="container">
        <div className="card">
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Company Information</div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
            Company ID: {company.id}
          </div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
            Created: {new Date(company.created_at).toLocaleDateString("de-DE")}
          </div>
          <CompanySettingsForm companyId={company.id} currentName={company.name} />
        </div>
      </main>
    </>
  );
}
