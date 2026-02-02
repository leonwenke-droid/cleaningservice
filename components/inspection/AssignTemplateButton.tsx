"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type Props = {
  inspectionId: string;
};

export function AssignTemplateButton({ inspectionId }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/inspections/${inspectionId}/assign-template`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("errors.failedToAssignTemplate"));
      }

      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("errors.failedToAssignTemplate"));
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="muted" style={{ marginBottom: 8, fontSize: 13 }}>
        {t("admin.assignTemplateDescription")}
      </div>
      <button
        type="button"
        onClick={handleAssign}
        className="btn"
        disabled={loading}
      >
        {loading ? t("common.assigning") : t("inspection.assignTemplate")}
      </button>
      {error && (
        <div className="muted" style={{ marginTop: 8, color: "#b91c1c", fontSize: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}
