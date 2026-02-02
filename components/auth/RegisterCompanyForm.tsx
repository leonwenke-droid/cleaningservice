"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function RegisterCompanyForm() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/register-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          adminEmail: adminEmail.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register company");
      }

      setSuccess(true);
      setError(null);
      // Optionally redirect to login after a delay
      setTimeout(() => {
        router.push("/login?message=invitation-sent");
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to register company");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="stack">
        <div style={{ fontWeight: 800 }}>Company registered!</div>
        <div className="muted">
          An invitation email has been sent to {adminEmail}. Please check your inbox and click the
          magic link to complete registration.
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          Redirecting to login...
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <div style={{ fontWeight: 800 }}>Create your company</div>
      <div className="muted" style={{ fontSize: 13 }}>
        Register a new company and invite the admin via email magic link.
      </div>

      <div>
        <div className="label">Company name</div>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Acme Cleaning Services"
          required
          disabled={loading}
        />
      </div>

      <div>
        <div className="label">Admin email</div>
        <input
          type="email"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          placeholder="admin@example.com"
          required
          disabled={loading}
        />
        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
          An invitation email will be sent to this address.
        </div>
      </div>

      {error ? <div className="muted" style={{ color: "#b91c1c" }}>{error}</div> : null}

      <button className="btn" disabled={loading}>
        {loading ? "Registering..." : "Register company"}
      </button>
    </form>
  );
}
