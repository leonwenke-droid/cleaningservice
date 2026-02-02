"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InitChecklistButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleInit() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/init-checklist", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize checklist");
      }

      setSuccess(data.message || "Checklist template initialized successfully!");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to initialize checklist");
      setLoading(false);
    }
  }

  return (
    <div>
      <button 
        type="button"
        onClick={handleInit}
        className="btn"
        disabled={loading}
      >
        {loading ? "Initializing…" : "Initialize Checklist Template"}
      </button>
      {error && (
        <div className="muted" style={{ marginTop: 8, color: "#b91c1c", fontSize: 12 }}>
          {error}
        </div>
      )}
      {success && (
        <div className="muted" style={{ marginTop: 8, color: "#059669", fontSize: 12 }}>
          {success}
        </div>
      )}
    </div>
  );
}
