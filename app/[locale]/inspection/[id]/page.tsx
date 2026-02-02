import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { TopBar } from "@/components/TopBar";
import { ChecklistFormClient } from "@/components/checklist/ChecklistFormClient";
import { InspectionActivityLog } from "@/components/inspection/InspectionActivityLog";
import { AssignTemplateButton } from "@/components/inspection/AssignTemplateButton";
import { getSessionAndProfile } from "@/lib/auth/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

type InspectionRow = {
  id: string;
  company_id: string;
  lead_id: string | null;
  site_id: string | null;
  scheduled_at: string | null;
  status: "open" | "in_progress" | "submitted" | "reviewed";
  assigned_to: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  notes: string | null;
  assigned_user: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
};

const statusKeyMap: Record<string, string> = {
  open: "open",
  in_progress: "inProgress",
  submitted: "submitted",
  reviewed: "reviewed",
};

export default async function InspectionPage({ params }: PageProps) {
  const { locale, id: inspectionId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const { session, profile } = await getSessionAndProfile();
  if (!session) redirect(`/${locale}/login`);

  if (!inspectionId) {
    return (
      <>
        <TopBar
          title={t("inspection.title")}
          right={
            <Link className="pill" href={`/${locale}`}>
              {t("common.back")}
            </Link>
          }
        />
        <main className="container">
          <div className="card">
            <div style={{ fontWeight: 900 }}>{t("inspection.invalidId")}</div>
            <div className="muted">{t("inspection.invalidIdDescription")}</div>
          </div>
        </main>
      </>
    );
  }

  const supabase = await createSupabaseServerClient();

  const { data: inspection, error: inspErr } = await supabase
    .from("inspections")
    .select(
      `
      id, 
      company_id, 
      lead_id, 
      site_id, 
      scheduled_at, 
      status, 
      assigned_to, 
      submitted_by, 
      submitted_at, 
      notes,
      checklist_template_version_id,
      assigned_user:app_users!inspections_assigned_to_fk(id, full_name, email)
    `
    )
    .eq("id", inspectionId)
    .single()
    .returns<InspectionRow & { checklist_template_version_id: string | null }>();

  if (inspErr || !inspection) {
    const err = inspErr as any;
    const isRLSError = err?.code === "PGRST116" || err?.message?.includes("row-level security");
    const isNotFound = err?.code === "PGRST116" || !inspection;
    const errorMessage = err?.message || t("common.error");

    return (
      <>
        <TopBar
          title={t("inspection.title")}
          right={
            <Link className="pill" href={`/${locale}`}>
              {t("common.back")}
            </Link>
          }
        />
        <main className="container">
          <div className="stack">
            <div className="card">
              <div style={{ fontWeight: 900 }}>{t("inspection.notFound")}</div>
              <div className="muted" style={{ marginTop: 8 }}>
                {isRLSError
                  ? profile.role === "worker"
                    ? t("inspection.workerAccessDenied")
                    : t("inspection.rlsAccessDenied")
                  : isNotFound
                  ? t("inspection.notFoundDescription", { id: inspectionId?.slice(0, 8) || inspectionId || "unknown" })
                  : errorMessage}
              </div>
              {err?.details && (
                <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                  Details: {err.details}
                </div>
              )}
            </div>
            <div className="card">
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{t("inspection.yourInfo")}</div>
              <div className="muted" style={{ fontSize: 13 }}>
                {t("inspection.companyId")}: {profile.company_id}
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                {t("inspection.userId")}: {session.user.id}
              </div>
            </div>
            <div className="card">
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{t("inspection.quickActions")}</div>
              <div className="stack" style={{ gap: 8 }}>
                <Link className="btn secondary" href={`/${locale}/inspections`}>
                  {t("inspection.viewAllInspections")}
                </Link>
                <Link className="btn secondary" href={`/${locale}/inspection/new`}>
                  {t("inspection.createNewInspection")}
                </Link>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (inspection.company_id !== profile.company_id) {
    return (
      <>
        <TopBar
          title={t("inspection.title")}
          right={
            <Link className="pill" href={`/${locale}`}>
              {t("common.back")}
            </Link>
          }
        />
        <main className="container">
          <div className="card">
            <div style={{ fontWeight: 900 }}>{t("inspection.accessDenied")}</div>
            <div className="muted">
              {t("inspection.accessDeniedDescription", {
                companyId: profile.company_id ? profile.company_id.slice(0, 8) : "unknown",
              })}
            </div>
          </div>
        </main>
      </>
    );
  }

  let template = null;

  if (!inspection.checklist_template_version_id) {
    const { data: activeTemplate } = await supabase
      .from("checklist_template_versions")
      .select("id")
      .eq("company_id", profile.company_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (activeTemplate) {
      await supabase
        .from("inspections")
        .update({ checklist_template_version_id: activeTemplate.id })
        .eq("id", inspection.id)
        .eq("company_id", profile.company_id);

      inspection.checklist_template_version_id = activeTemplate.id;
    }
  }

  if (inspection.checklist_template_version_id) {
    const { data: templateData } = await supabase
      .from("checklist_template_versions")
      .select(
        `
        id,
        version_number,
        name,
        description,
        items:checklist_items(
          id,
          section,
          sort_order,
          item_key,
          label,
          help_text,
          item_type,
          required,
          validation_rules,
          conditional_logic,
          enum_options,
          default_value
        )
      `
      )
      .eq("id", inspection.checklist_template_version_id)
      .eq("company_id", profile.company_id)
      .single();

    if (templateData) {
      template = templateData;
    }
  }

  const { data: responses } = await supabase
    .from("inspection_responses")
    .select("checklist_item_id, value, note")
    .eq("inspection_id", inspection.id)
    .eq("company_id", profile.company_id);

  const { data: files } = await supabase
    .from("inspection_files")
    .select("id, checklist_item_id, storage_path, file_name")
    .eq("inspection_id", inspection.id)
    .eq("company_id", profile.company_id);

  const responsesMap: Record<string, any> = {};
  (responses || []).forEach((r) => {
    try {
      responsesMap[r.checklist_item_id] = typeof r.value === "string" ? JSON.parse(r.value) : r.value;
    } catch {
      responsesMap[r.checklist_item_id] = r.value;
    }
  });

  const statusLabel = t(`inspection.statusValues.${statusKeyMap[inspection.status] ?? inspection.status}` as "inspection.statusValues.open");

  return (
    <>
      <TopBar
        title={t("inspection.title")}
        right={
          <Link className="pill" href={`/${locale}`}>
            {t("common.back")}
          </Link>
        }
      />
      <main className="container">
        <div className="stack">
          <div className="card">
            <div style={{ fontWeight: 900, marginBottom: 6 }}>
              {t("inspection.status")}: {statusLabel}
            </div>
            {inspection.assigned_user ? (
              <div className="muted" style={{ marginTop: 6, fontSize: 14 }}>
                {t("inspection.assignedTo")}: <strong>{inspection.assigned_user.full_name || inspection.assigned_user.email || t("common.unknown")}</strong>
              </div>
            ) : inspection.assigned_to ? (
              <div className="muted" style={{ marginTop: 6, fontSize: 12, wordBreak: "break-all" }}>
                {t("inspection.assignedTo")}: {inspection.assigned_to}
              </div>
            ) : null}
            {inspection.scheduled_at && (
              <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                {t("inspection.scheduled")}: {new Date(inspection.scheduled_at).toLocaleString(locale === "de" ? "de-DE" : undefined)}
              </div>
            )}
            <div className="muted" style={{ marginTop: 6, fontSize: 11, wordBreak: "break-all" }}>
              {t("inspection.id")}: {inspection.id}
            </div>
          </div>
          {template ? (
            <ChecklistFormClient
              inspectionId={inspection.id}
              companyId={profile.company_id}
              userId={session.user.id}
              userRole={profile.role}
              template={template}
              existingResponses={responsesMap}
              existingFiles={files || []}
              inspectionStatus={inspection.status}
            />
          ) : (
            <div className="card">
              <div style={{ fontWeight: 800, marginBottom: 8 }}>{t("inspection.noTemplate")}</div>
              <div className="muted" style={{ marginBottom: 12 }}>
                {t("inspection.noTemplateDescription")}
              </div>
              {(profile.role === "admin" || profile.role === "dispatcher") && (
                <AssignTemplateButton inspectionId={inspection.id} />
              )}
              {profile.role === "worker" && (
                <div className="muted" style={{ fontSize: 13 }}>
                  {t("inspection.contactAdmin")}
                </div>
              )}
            </div>
          )}
          <InspectionActivityLog inspectionId={inspection.id} companyId={profile.company_id} />
        </div>
      </main>
    </>
  );
}
