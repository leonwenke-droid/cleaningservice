"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  leadId: string;
  companyId: string;
};

export function DeleteLeadButton({ leadId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm("Remove this lead? This cannot be undone.")) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/leads/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ lead_id: leadId })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError((data as { error?: string }).error || "Failed to remove lead");
        return;
      }
      if ((data as { success?: boolean }).success !== true) {
        setError((data as { error?: string }).error || "Failed to remove lead");
        return;
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove lead");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        style={{
          fontSize: 13,
          padding: "6px 10px",
          background: "#fee2e2",
          color: "#b91c1c",
          border: "1px solid #fecaca",
          borderRadius: 6,
          cursor: loading ? "not-allowed" : "pointer"
        }}
      >
        {loading ? "Removing…" : "Remove lead"}
      </button>
      {error && (
        <span className="muted" style={{ fontSize: 12, color: "#b91c1c" }}>
          {error}
        </span>
      )}
    </>
  );
}
