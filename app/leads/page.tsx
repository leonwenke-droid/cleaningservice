import Link from "next/link";
import { redirect } from "next/navigation";

import { TopBar } from "@/components/TopBar";
import { getSessionAndProfile } from "@/lib/auth/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DeleteLeadButton } from "@/components/lead/DeleteLeadButton";

type LeadRow = {
  id: string;
  title: string | null;
  status: "new" | "qualifying" | "qualified" | "inspection_scheduled" | "inspected" | "quoted" | "won" | "lost";
  description: string | null;
  customer_id: string | null;
  site_id: string | null;
  created_at: string;
};

export default async function LeadsPage() {
  const { session, profile } = await getSessionAndProfile();
  if (!session) redirect("/login");

  const canView = profile.role === "admin" || profile.role === "dispatcher";
  if (!canView) redirect("/");

  const supabase = await createSupabaseServerClient();

  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, title, status, description, customer_id, site_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<LeadRow[]>();

  if (error) {
    return (
      <>
        <TopBar
          title="Leads"
          right={
            <Link className="pill" href="/">
              Home
            </Link>
          }
        />
        <main className="container">
          <div className="card">
            <div style={{ fontWeight: 900 }}>Error</div>
            <div className="muted">{error.message}</div>
          </div>
        </main>
      </>
    );
  }

  const statusColors: Record<string, string> = {
    new: "#3b82f6",
    qualifying: "#8b5cf6",
    qualified: "#10b981",
    inspection_scheduled: "#f59e0b",
    inspected: "#6366f1",
    quoted: "#ec4899",
    won: "#10b981",
    lost: "#ef4444"
  };

  return (
    <>
      <TopBar
        title="Leads"
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link className="pill" href="/lead/new">
              New
            </Link>
            <Link className="pill" href="/">
              Home
            </Link>
          </div>
        }
      />
      <main className="container">
        <div className="stack">
          {leads && leads.length > 0 ? (
            leads.map((lead) => (
              <div key={lead.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                  <div style={{ fontWeight: 800 }}>{lead.title || "Untitled"}</div>
                  <span
                    className="pill"
                    style={{
                      backgroundColor: statusColors[lead.status] + "20",
                      borderColor: statusColors[lead.status],
                      color: statusColors[lead.status]
                    }}
                  >
                    {lead.status}
                  </span>
                </div>
                {lead.description ? (
                  <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                    {lead.description.slice(0, 100)}
                    {lead.description.length > 100 ? "…" : ""}
                  </div>
                ) : null}
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <Link
                    className="btn"
                    href={`/inspection/new?lead_id=${lead.id}`}
                    style={{ fontSize: 13, padding: "6px 10px" }}
                  >
                    Create inspection
                  </Link>
                  {profile.role === "admin" && (
                    <DeleteLeadButton leadId={lead.id} companyId={profile.company_id} />
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="card">
              <div style={{ fontWeight: 800 }}>No leads yet</div>
              <div className="muted">Create your first lead to get started.</div>
              <Link className="btn" href="/lead/new" style={{ marginTop: 12 }}>
                Create lead
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
