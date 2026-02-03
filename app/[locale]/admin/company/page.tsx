import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { TopBar } from "@/components/TopBar";
import { getSessionAndProfile } from "@/lib/auth/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanySettingsForm } from "@/components/admin/CompanySettingsForm";

export default async function AdminCompanyPage({
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
  const { data: company, error } = await supabase
    .from("companies")
    .select("id, name, created_at")
    .eq("id", profile.company_id)
    .single();

  if (error || !company) {
    return (
      <>
        <TopBar
          title={t("admin.companySettings")}
          right={
            <Link className="pill" href={`/${locale}`}>
              {t("navigation.home")}
            </Link>
          }
        />
        <main className="container">
          <div className="card">
            <div style={{ fontWeight: 900 }}>{t("common.error")}</div>
            <div className="muted">{error?.message || t("errors.notFound")}</div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar
        title={t("admin.companySettings")}
        right={
          <Link className="pill" href={`/${locale}`}>
            {t("navigation.home")}
          </Link>
        }
      />
      <main className="container">
        <div className="card">
          <div style={{ fontWeight: 900, marginBottom: 6 }}>{t("admin.companyInformation")}</div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
            {t("inspection.companyId")}: {company.id}
          </div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
            {t("admin.created")}: {new Date(company.created_at).toLocaleDateString("de-DE")}
          </div>
          <CompanySettingsForm companyId={company.id} currentName={company.name} />
        </div>
      </main>
    </>
  );
}
