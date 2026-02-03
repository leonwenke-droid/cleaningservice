import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { TopBar } from "@/components/TopBar";
import { InitChecklistButton } from "@/components/admin/InitChecklistButton";
import { getSessionAndProfile } from "@/lib/auth/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ChecklistAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const { session, profile } = await getSessionAndProfile();
  if (!session) redirect(`/${locale}/login`);

  if (profile.role !== "admin") {
    redirect(`/${locale}`);
  }

  const supabase = await createSupabaseServerClient();

  const { data: templateVersion } = await supabase
    .from("checklist_template_versions")
    .select("id, name, version_number, is_active, created_at")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let itemCount = 0;
  if (templateVersion) {
    const { count } = await supabase
      .from("checklist_items")
      .select("*", { count: "exact", head: true })
      .eq("template_version_id", templateVersion.id)
      .eq("company_id", profile.company_id);
    itemCount = count || 0;
  }

  return (
    <>
      <TopBar
        title={t("admin.checklistManagement")}
        right={
          <Link className="pill" href={`/${locale}/admin/company`}>
            {t("common.back")}
          </Link>
        }
      />
      <main className="container">
        <div className="stack">
          <div className="card">
            <div style={{ fontWeight: 900, marginBottom: 8 }}>{t("admin.checklistTemplateStatus")}</div>

            {templateVersion ? (
              <div>
                <div className="muted" style={{ marginBottom: 12 }}>
                  <div><strong>{t("admin.template")}:</strong> {templateVersion.name}</div>
                  <div><strong>{t("admin.version")}:</strong> {templateVersion.version_number}</div>
                  <div><strong>{t("admin.status")}:</strong> {templateVersion.is_active ? t("admin.active") : t("admin.inactive")}</div>
                  <div><strong>{t("admin.items")}:</strong> {itemCount}</div>
                </div>

                {itemCount === 0 && (
                  <div
                    style={{
                      padding: 12,
                      background: "#fef3c7",
                      color: "#92400e",
                      borderRadius: 6,
                      marginTop: 12,
                      fontSize: 13,
                    }}
                  >
                    <strong>{t("common.error")}</strong>: {t("admin.templateWarning")}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="muted" style={{ marginBottom: 12 }}>
                  {t("admin.noTemplateFound")}
                </div>
                <InitChecklistButton />
              </div>
            )}
          </div>

          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 8 }}>{t("admin.setupInstructions")}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              <ol style={{ paddingLeft: 20, marginTop: 8 }}>
                <li style={{ marginBottom: 8 }}>{t("admin.setupStep1")}</li>
                <li style={{ marginBottom: 8 }}>{t("admin.setupStep2", { script: "seed_checklist_v1.sql" })}</li>
                <li style={{ marginBottom: 8 }}>{t("admin.setupStep3")}</li>
                <li>{t("admin.setupStep4")}</li>
              </ol>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
