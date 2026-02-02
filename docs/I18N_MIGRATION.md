# i18n Migration Guide

## Current Status

✅ **Completed:**
- i18n infrastructure set up
- Translation files for all 5 languages
- Language switcher component
- Home page (`app/[locale]/page.tsx`)
- Login page (`app/[locale]/login/page.tsx`)

⏳ **To Do:**
- Move remaining pages to `app/[locale]/` folder
- Update all redirects to include locale
- Replace hardcoded strings with translation keys

## Quick Fix for 404

The 404 error happens because middleware redirects to `/de/*` but pages aren't under `[locale]` yet.

**Temporary solution:** The middleware now uses `localePrefix: 'always'` which redirects `/` to `/de`. 

**To fix 404:**
1. Restart dev server: `npm run dev`
2. Visit `http://localhost:3000` - it should redirect to `http://localhost:3000/de`
3. The home page should work at `/de`

## Pages That Need Migration

Move these pages from `app/` to `app/[locale]/`:

- [ ] `app/login/page.tsx` → `app/[locale]/login/page.tsx` ✅ (done)
- [ ] `app/register/page.tsx` → `app/[locale]/register/page.tsx`
- [ ] `app/onboarding/page.tsx` → `app/[locale]/onboarding/page.tsx`
- [ ] `app/inspections/page.tsx` → `app/[locale]/inspections/page.tsx`
- [ ] `app/inspection/new/page.tsx` → `app/[locale]/inspection/new/page.tsx`
- [ ] `app/inspection/[id]/page.tsx` → `app/[locale]/inspection/[id]/page.tsx`
- [ ] `app/leads/page.tsx` → `app/[locale]/leads/page.tsx`
- [ ] `app/lead/new/page.tsx` → `app/[locale]/lead/new/page.tsx`
- [ ] `app/admin/users/page.tsx` → `app/[locale]/admin/users/page.tsx`
- [ ] `app/admin/company/page.tsx` → `app/[locale]/admin/company/page.tsx`
- [ ] `app/admin/checklist/page.tsx` → `app/[locale]/admin/checklist/page.tsx`

## Migration Steps for Each Page

1. **Move the file:**
   ```bash
   mv app/page.tsx app/[locale]/page.tsx
   ```

2. **Update the component:**
   - Add `params: Promise<{ locale: string }>` to props
   - Extract locale: `const { locale } = await params;`
   - Import translations: `import { getTranslations } from 'next-intl/server';`
   - Use translations: `const t = await getTranslations();`
   - Update links: `href="/path"` → `href={`/${locale}/path`}`
   - Replace hardcoded strings with `t('key')`

3. **Update redirects:**
   - `redirect("/login")` → `redirect(`/${locale}/login`)`
   - `redirect("/")` → `redirect(`/${locale}`)`

## Example Migration

**Before:**
```tsx
export default async function MyPage() {
  const { session } = await getSessionAndProfile();
  if (!session) redirect("/login");
  
  return <h1>My Page</h1>;
}
```

**After:**
```tsx
import { getTranslations } from 'next-intl/server';

export default async function MyPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();
  const { session } = await getSessionAndProfile();
  
  if (!session) redirect(`/${locale}/login`);
  
  return <h1>{t('myPage.title')}</h1>;
}
```

## Testing

After migrating a page:
1. Restart dev server
2. Visit `http://localhost:3000/de/your-page`
3. Test language switcher
4. Verify translations work
