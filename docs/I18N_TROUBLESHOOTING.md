# i18n Troubleshooting Guide

## Redirect Loop Issue

If you're experiencing "too many redirects" when accessing `/de`:

### Solution 1: Restart Dev Server
After changing middleware or layout files, restart your Next.js dev server:
```bash
# Stop the server (Ctrl+C) and restart
npm run dev
```

### Solution 2: Clear Next.js Cache
```bash
rm -rf .next
npm run dev
```

### Solution 3: Check Middleware Matcher
Ensure the middleware matcher excludes API routes and static files:
```typescript
matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
```

### Solution 4: Verify Layout Structure
- Root `app/layout.tsx` should have `<html><body>` tags
- `app/[locale]/layout.tsx` should NOT have `<html><body>` tags (to avoid nesting)
- Only `app/[locale]/layout.tsx` should have `NextIntlClientProvider`

### Solution 5: Check for Conflicting Pages
Make sure you don't have both:
- `app/page.tsx` AND `app/[locale]/page.tsx`
- Keep only `app/[locale]/page.tsx`

## Current Setup

✅ Root layout: `app/layout.tsx` (has html/body, no NextIntl)
✅ Locale layout: `app/[locale]/layout.tsx` (has NextIntl provider, no html/body)
✅ Middleware: Redirects `/` to `/de`
✅ Translation files: All 5 languages created

## Next Steps

1. **Restart dev server** - This is usually the fix
2. **Move remaining pages** to `app/[locale]/` directory
3. **Update all redirects** to include locale prefix
4. **Test language switcher** functionality
