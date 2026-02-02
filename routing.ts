import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from './lib/i18n-constants';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
});
