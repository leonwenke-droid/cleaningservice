import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { TopBar } from "@/components/TopBar";
import { LeadNewForm } from "@/components/lead/LeadNewForm";
import { getSessionAndProfile } from "@/lib/auth/server";

export default async function LeadNewPage({
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
  if (!canCreate) redirect(`/${locale}`);

  return (
    <>
      <TopBar
        title={t("lead.new")}
        right={
          <Link className="pill" href={`/${locale}`}>
            {t("common.back")}
          </Link>
        }
      />
      <main className="container">
        <div className="card">
          <LeadNewForm
            companyId={profile.company_id}
            createdBy={session.user.id}
          />
        </div>
      </main>
    </>
  );
}
