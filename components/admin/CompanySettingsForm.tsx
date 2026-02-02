"use client";

import { useState, type FormEvent } from "react";

type Props = {
  companyId: string;
  currentName: string;
};

export function CompanySettingsForm({ companyId, currentName }: Props) {
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/companies/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError((data as { error?: string }).error || "Failed to update company");
        return;
      }

      if ((data as { success?: boolean }).success !== true) {
        setError((data as { error?: string }).error || "Update failed");
        return;
      }

      setSuccess("Company name updated");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update company");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stack" style={{ marginTop: 16 }}>
      <div>
        <label className="label">Company name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      {error && (
        <div className="muted" style={{ color: "#b91c1c" }}>
          {error}
        </div>
      )}

      {success && (
        <div className="muted" style={{ color: "#065f46" }}>
          {success}
        </div>
      )}

      <button type="submit" className="btn" disabled={loading || name.trim() === currentName}>
        {loading ? "Updating…" : "Update company name"}
      </button>
    </form>
  );
}
