import Link from "next/link";
import { redirect } from "next/navigation";

import { TopBar } from "@/components/TopBar";
import { getSessionAndProfile } from "@/lib/auth/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CreateInspectionForm } from "@/components/inspection/CreateInspectionForm";

type PageProps = {
  searchParams: Promise<{ lead_id?: string }> | { lead_id?: string };
};

export default async function InspectionNewPage({ searchParams }: PageProps) {
  const { session, profile } = await getSessionAndProfile();
  if (!session) redirect("/login");

  const canCreate = profile.role === "admin" || profile.role === "dispatcher";
  if (!canCreate) redirect("/");

  const resolvedSearchParams = await searchParams;
  const leadId = resolvedSearchParams?.lead_id;

  const supabase = await createSupabaseServerClient();

  let lead = null;
  if (leadId) {
    const { data } = await supabase
      .from("leads")
      .select("id, title, site_id, company_id")
      .eq("id", leadId)
      .eq("company_id", profile.company_id)
      .single();
    if (data) lead = data;
  }

  const { data: companyUsers } = await supabase
    .from("app_users")
    .select("id, full_name, role")
    .eq("company_id", profile.company_id)
    .order("full_name", { ascending: true, nullsFirst: false });

  return (
    <>
      <TopBar
        title="New inspection"
        right={
          <Link className="pill" href="/inspections">
            Back
          </Link>
        }
      />
      <main className="container">
        <div className="card">
          <CreateInspectionForm
            companyId={profile.company_id}
            userId={session.user.id}
            leadId={lead?.id ?? null}
            siteId={lead?.site_id ?? null}
            companyUsers={companyUsers || []}
          />
        </div>
      </main>
    </>
  );
}
