import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale, type Locale } from './lib/i18n-constants';

export default getRequestConfig(async ({ requestLocale }) => {
  // Get locale from request (set by middleware)
  let locale = await requestLocale;

  // Validate locale - fallback to default if invalid
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});

// Re-export for convenience
export { locales, defaultLocale, type Locale } from './lib/i18n-constants';
