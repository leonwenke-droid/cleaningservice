"use client";

import type { FormEvent } from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';

type AuthFormProps = {
  initialMessage?: string | null;
};

export function AuthForm({ initialMessage }: AuthFormProps = {}) {
  const t = useTranslations();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check for errors in URL hash (from Supabase redirects)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.substring(1)); // Remove #
        const errorDescription = params.get("error_description");
        const errorCode = params.get("error_code");
        
        if (errorDescription || errorCode) {
          // Decode the error message
          const errorMsg = errorDescription 
            ? decodeURIComponent(errorDescription.replace(/\+/g, " "))
            : errorCode || "Authentication error";
          
          setError(errorMsg);
          
          // Clean up the URL
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      }
    }
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Call our API route which uses n8n to send email
      const response = await fetch("/api/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('errors.generic'));
      }

      setSuccess(true);
      setError(null);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : t('errors.generic');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="stack">
        <div style={{ fontWeight: 800 }}>{t('auth.checkEmail')}</div>
        <div className="muted">
          {t('auth.magicLinkEmail', { email })}
        </div>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            setSuccess(false);
            setEmail("");
          }}
        >
          {t('auth.sendAnotherLink')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <div style={{ fontWeight: 900 }}>{t('auth.signIn')}</div>

      {initialMessage === "invitation-sent" && (
        <div className="muted" style={{ padding: 8, background: "#dbeafe", borderRadius: 6 }}>
          {t('auth.invitationSent')}
        </div>
      )}

      <div>
        <div className="label">{t('auth.email')}</div>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          disabled={loading}
        />
        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
          {t('auth.magicLinkDescription')}
        </div>
      </div>

      {error ? <div className="muted" style={{ color: "#b91c1c" }}>{error}</div> : null}

      <button className="btn" disabled={loading}>
        {loading ? t('common.sending') : t('auth.sendMagicLinkButton')}
      </button>

      <div className="muted" style={{ fontSize: 13, textAlign: "center", marginTop: 8 }}>
        {t('auth.newCompany')} <a href="/register">{t('auth.registerHere')}</a>
      </div>
    </form>
  );
}
