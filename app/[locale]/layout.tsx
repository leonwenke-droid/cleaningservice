import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/lib/i18n-constants';
import '../globals.css';

export const metadata = {
  title: "Cleaning MVP",
  description: "Lead intake + inspections"
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Validate locale
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // Set the locale for this request so getMessages() can access it
  setRequestLocale(locale);

  // Get messages for this locale
  const messages = await getMessages();

  // Provide NextIntl provider - html/body are in root layout
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
