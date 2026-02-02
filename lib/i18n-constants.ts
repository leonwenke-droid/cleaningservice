// Shared constants for i18n - no dependencies to avoid circular imports
export const locales = ['de', 'en', 'pl', 'ro', 'ru'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'de';
