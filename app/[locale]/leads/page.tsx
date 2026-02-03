import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { TopBar } from "@/components/TopBar";
import { getSessionAndProfile } from "@/lib/auth/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DeleteLeadButton } from "@/components/lead/DeleteLeadButton";

type LeadRow = {
  id: string;
  title: string | null;
  status: string;
  description: string | null;
  customer_id: string | null;
  site_id: string | null;
  created_at: string;
};

export default async function LeadsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const { session, profile } = await getSessionAndProfile();
  if (!session) redirect(`/${locale}/login`);

  const canView = profile.role === "admin" || profile.role === "dispatcher";
  if (!canView) redirect(`/${locale}`);

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
          title={t("lead.title")}
          right={
            <Link className="pill" href={`/${locale}`}>
              {t("navigation.home")}
            </Link>
          }
        />
        <main className="container">
          <div className="card">
            <div style={{ fontWeight: 900 }}>{t("common.error")}</div>
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
    lost: "#ef4444",
  };

  return (
    <>
      <TopBar
        title={t("lead.title")}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link className="pill" href={`/${locale}/lead/new`}>
              {t("lead.new")}
            </Link>
            <Link className="pill" href={`/${locale}`}>
              {t("navigation.home")}
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
                  <div style={{ fontWeight: 800 }}>{lead.title || t("common.noName")}</div>
                  <span
                    className="pill"
                    style={{
                      backgroundColor: (statusColors[lead.status] || "#6b7280") + "20",
                      borderColor: statusColors[lead.status] || "#6b7280",
                      color: statusColors[lead.status] || "#6b7280",
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
                    href={`/${locale}/inspection/new?lead_id=${lead.id}`}
                    style={{ fontSize: 13, padding: "6px 10px" }}
                  >
                    {t("inspection.new")}
                  </Link>
                  {profile.role === "admin" && (
                    <DeleteLeadButton leadId={lead.id} companyId={profile.company_id} />
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="card">
              <div style={{ fontWeight: 800 }}>{t("lead.noLeads")}</div>
              <div className="muted">{t("lead.noLeadsDescription")}</div>
              <Link className="btn" href={`/${locale}/lead/new`} style={{ marginTop: 12 }}>
                {t("lead.create")}
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
