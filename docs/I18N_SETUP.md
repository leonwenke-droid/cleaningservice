# Internationalization (i18n) Setup

This application supports multiple languages:
- **German (de)** - Default language
- **English (en)**
- **Polish (pl)**
- **Romanian (ro)**
- **Russian (ru)**

## Architecture

The app uses `next-intl` for internationalization with the App Router pattern.

### File Structure

```
app/
  [locale]/          # All pages are under locale routing
    page.tsx
    layout.tsx
    inspections/
    ...
messages/
  de.json           # German translations
  en.json           # English translations
  pl.json           # Polish translations
  ro.json           # Romanian translations
  ru.json           # Russian translations
i18n.ts            # i18n configuration
middleware.ts      # Locale detection and routing
```

## Usage

### In Server Components

```tsx
import { getTranslations } from 'next-intl/server';

export default async function MyPage() {
  const t = await getTranslations();
  
  return <h1>{t('common.save')}</h1>;
}
```

### In Client Components

```tsx
'use client';
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations();
  
  return <button>{t('common.save')}</button>;
}
```

### Navigation with Locale

Always include the locale in links:

```tsx
<Link href={`/${locale}/inspections`}>
  {t('navigation.inspections')}
</Link>
```

## Adding New Translations

1. Add the key-value pair to all language files in `messages/`
2. Use nested keys for organization: `section.key`
3. Example:
   ```json
   {
     "inspection": {
       "title": "Inspektion",
       "new": "Neue Inspektion"
     }
   }
   ```

## Language Switcher

The `LanguageSwitcher` component is available and can be added to any page:

```tsx
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

<LanguageSwitcher />
```

## User Language Preference

To store user language preference in the database:

1. Add `preferred_language` column to `app_users` table
2. Update user preference when they change language
3. Use preference to set default locale on login

## Migration Status

Pages that need to be migrated to `[locale]` routing:
- [ ] All pages in `app/` need to be moved to `app/[locale]/`
- [ ] All API routes need locale-aware redirects
- [ ] All components need to use translations

## Next Steps

1. Move all pages to `app/[locale]/` directory
2. Update all hardcoded strings to use translations
3. Add language preference to user profile
4. Update API routes to handle locale
5. Add translations for checklist items (stored in database)
