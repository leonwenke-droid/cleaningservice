import Link from "next/link";
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { TopBar } from "@/components/TopBar";
import { AuthForm } from "@/components/auth/AuthForm";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default async function LoginPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ error?: string; message?: string }>;
}) {
  const { locale } = await params;
  
  // Set the locale for this request
  setRequestLocale(locale);
  
  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams?.error;
  const message = resolvedSearchParams?.message;
  const t = await getTranslations();

  return (
    <>
      <TopBar 
        title={t('auth.login')} 
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <LanguageSwitcher />
            <Link href={`/${locale}`} className="pill">
              {t('navigation.home')}
            </Link>
          </div>
        } 
      />
      <main className="container">
        <div className="stack">
          {error ? (
            <div className="card">
              <div style={{ fontWeight: 800 }}>{t('errors.generic')}</div>
              <div className="muted">{error}</div>
            </div>
          ) : null}
          <div className="card">
            <AuthForm initialMessage={message} />
          </div>
        </div>
      </main>
    </>
  );
}
