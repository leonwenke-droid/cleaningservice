"use client";

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { locales, type Locale } from '@/lib/i18n-constants';

const languageNames: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English',
  pl: 'Polski',
  ro: 'Română',
  ru: 'Русский'
};

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [saving, setSaving] = useState(false);

  async function switchLocale(newLocale: Locale) {
    if (newLocale === locale) return;
    
    setSaving(true);
    
    // Save preference to database
    try {
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_language: newLocale }),
      });
    } catch (err) {
      console.error('Failed to save language preference:', err);
    }
    
    // Update URL
    const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
    const newPath = `/${newLocale}${pathWithoutLocale}`;
    router.push(newPath);
    router.refresh();
    
    setSaving(false);
  }

  return (
    <select
      value={locale}
      onChange={(e) => switchLocale(e.target.value as Locale)}
      disabled={saving}
      style={{
        padding: '6px 12px',
        borderRadius: '6px',
        border: '1px solid #d1d5db',
        fontSize: '14px',
        background: 'white',
        cursor: saving ? 'wait' : 'pointer',
        opacity: saving ? 0.6 : 1
      }}
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {languageNames[loc]}
        </option>
      ))}
    </select>
  );
}

