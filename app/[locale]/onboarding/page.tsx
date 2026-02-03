import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { TopBar } from "@/components/TopBar";
import { CreateCompanyForm } from "@/components/onboarding/CreateCompanyForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/${locale}/login`);
  }

  const { data: profile } = await supabase
    .from("app_users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (profile) {
    redirect(`/${locale}`);
  }

  return (
    <>
      <TopBar title={t("onboarding.welcome")} />
      <main className="container">
        <div className="card">
          <div style={{ fontWeight: 900, marginBottom: 8 }}>{t("onboarding.createCompany")}</div>
          <div className="muted" style={{ marginBottom: 16 }}>
            {t("onboarding.createCompanyDescription")}
          </div>
          <CreateCompanyForm userEmail={user.email || ""} />
        </div>
      </main>
    </>
  );
}
