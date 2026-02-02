import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getSessionAndProfile } from "@/lib/auth/server";
import { TopBar } from "@/components/TopBar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Set the locale for this request
  setRequestLocale(locale);
  
  const t = await getTranslations();
  const { session, profile } = await getSessionAndProfile();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  const canCreateLead = profile.role === "admin" || profile.role === "dispatcher";

  return (
    <>
      <TopBar
        title={t('navigation.home')}
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <LanguageSwitcher />
            <Link className="pill" href={`/${locale}/logout`}>
              {t('auth.logout')}
            </Link>
          </div>
        }
      />
      <main className="container">
        <div className="stack">
          <div className="card">
            <div style={{ fontWeight: 800 }}>{t('common.success')}</div>
            <div className="muted">
              {profile.full_name || session.user.email}
              {profile.full_name && (
                <span style={{ fontSize: 13, opacity: 0.7, marginLeft: 8 }}>
                  ({session.user.email})
                </span>
              )}
            </div>
            <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
              <span className="pill">Role: {profile.role}</span>
              <span className="pill">Company: {profile.company_id}</span>
            </div>
          </div>

          {canCreateLead ? (
            <Link className="btn" href={`/${locale}/lead/new`}>
              {t('lead.create')}
            </Link>
          ) : (
            <div className="card muted">
              You don't have permission to create leads.
            </div>
          )}

          <Link className="btn secondary" href={`/${locale}/inspections`}>
            {t('navigation.inspections')}
          </Link>

          {canCreateLead ? (
            <Link className="btn secondary" href={`/${locale}/leads`}>
              {t('navigation.leads')}
            </Link>
          ) : null}

          {profile.role === "admin" ? (
            <>
              <Link className="btn secondary" href={`/${locale}/admin/users`}>
                {t('admin.userManagement')}
              </Link>
              <Link className="btn secondary" href={`/${locale}/admin/company`}>
                {t('admin.companySettings')}
              </Link>
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}
