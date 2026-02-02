import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { TopBar } from "@/components/TopBar";
import { getSessionAndProfile } from "@/lib/auth/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type InspectionRow = {
  id: string;
  status: "open" | "in_progress" | "submitted" | "reviewed";
  scheduled_at: string | null;
  assigned_to: string | null;
  notes: string | null;
  lead_id: string | null;
  site_id: string | null;
  assigned_user: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
};

export default async function InspectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const { session, profile } = await getSessionAndProfile();
  if (!session) redirect(`/${locale}/login`);

  const canCreate = profile.role === "admin" || profile.role === "dispatcher";

  const supabase = await createSupabaseServerClient();

  const { data: inspections, error } = await supabase
    .from("inspections")
    .select(`
      id, 
      status, 
      scheduled_at, 
      assigned_to, 
      notes, 
      lead_id, 
      site_id,
      assigned_user:app_users!inspections_assigned_to_fk(id, full_name, email)
    `)
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<InspectionRow[]>();

  if (error) {
    return (
      <>
        <TopBar
          title={t("navigation.inspections")}
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
    open: "#f59e0b",
    in_progress: "#3b82f6",
    submitted: "#10b981",
    reviewed: "#6b7280",
  };

  const statusKeyMap: Record<string, string> = {
    open: "open",
    in_progress: "inProgress",
    submitted: "submitted",
    reviewed: "reviewed",
  };
  const statusLabel = (status: string) =>
    t(`inspection.statusValues.${statusKeyMap[status] ?? status}` as "inspection.statusValues.open");

  return (
    <>
      <TopBar
        title={t("navigation.inspections")}
        right={
          <Link className="pill" href={`/${locale}`}>
            {t("navigation.home")}
          </Link>
        }
      />
      <main className="container">
        <div className="stack">
          {inspections && inspections.length > 0 ? (
            inspections.map((insp) => (
              <Link
                key={insp.id}
                href={`/${locale}/inspection/${insp.id}`}
                className="card"
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                  <div style={{ fontWeight: 800 }}>
                    {insp.scheduled_at
                      ? new Date(insp.scheduled_at).toLocaleDateString(locale === "de" ? "de-DE" : undefined, {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : t("inspection.noDate")}
                  </div>
                  <span
                    className="pill"
                    style={{
                      backgroundColor: statusColors[insp.status] + "20",
                      borderColor: statusColors[insp.status],
                      color: statusColors[insp.status],
                    }}
                  >
                    {statusLabel(insp.status)}
                  </span>
                </div>
                {insp.notes ? (
                  <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                    {insp.notes.slice(0, 100)}
                    {insp.notes.length > 100 ? "…" : ""}
                  </div>
                ) : null}
                {insp.assigned_user ? (
                  <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                    {t("inspection.assignedTo")}: <strong>{insp.assigned_user.full_name || insp.assigned_user.email || t("common.unknown")}</strong>
                  </div>
                ) : insp.assigned_to ? (
                  <div className="muted" style={{ marginTop: 6, fontSize: 11, wordBreak: "break-all" }}>
                    {t("inspection.assignedTo")}: {insp.assigned_to.slice(0, 8)}…
                  </div>
                ) : null}
                <div className="muted" style={{ marginTop: 6, fontSize: 11, wordBreak: "break-all" }}>
                  {insp.id.slice(0, 8)}…
                </div>
              </Link>
            ))
          ) : (
            <div className="card">
              <div style={{ fontWeight: 800 }}>{t("inspection.noInspections")}</div>
              <div className="muted" style={{ marginTop: 6 }}>
                {canCreate
                  ? t("inspection.noInspectionsDescription")
                  : t("inspection.noInspectionsWorker")}
              </div>
              {canCreate ? (
                <div style={{ marginTop: 12 }}>
                  <Link className="btn" href={`/${locale}/inspection/new`}>
                    {t("inspection.create")}
                  </Link>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
