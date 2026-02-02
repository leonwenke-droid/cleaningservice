"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Props = {
  userEmail: string;
};

export function CreateCompanyForm({ userEmail }: Props) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/companies/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: companyName.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError((data as { error?: string }).error || "Failed to create company");
        return;
      }

      if ((data as { success?: boolean }).success !== true) {
        setError((data as { error?: string }).error || "Company creation failed");
        return;
      }

      // Redirect to dashboard
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create company");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stack">
      <div>
        <div className="label">Company name *</div>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. Gebäudereinigung Bock GmbH"
          required
          autoFocus
        />
        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
          You'll be the administrator of this company ({userEmail}).
        </div>
      </div>

      {error && (
        <div className="muted" style={{ color: "#b91c1c" }}>
          {error}
        </div>
      )}

      <button type="submit" className="btn" disabled={loading || !companyName.trim()}>
        {loading ? "Creating…" : "Create company"}
      </button>
    </form>
  );
}
