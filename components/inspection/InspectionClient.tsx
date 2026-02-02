"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Inspection = {
  id: string;
  company_id: string;
  lead_id: string | null;
  site_id: string | null;
  scheduled_at: string | null;
  status: "open" | "in_progress" | "submitted" | "reviewed";
  assigned_to: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  notes: string | null;
};

type Item = {
  id: string;
  company_id: string;
  inspection_id: string;
  label_snapshot: string;
  response_text: string | null;
  is_completed: boolean;
  photo_object_path: string | null;
};

type Props = {
  userId: string;
  companyId: string;
  inspection: Inspection;
  items: Item[];
  userRole: "admin" | "dispatcher" | "worker";
};

export function InspectionClient({ userId, companyId, inspection, items, userRole }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [localItems, setLocalItems] = useState<Item[]>(items);
  const [saving, setSaving] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLocked = inspection.status === "submitted" || inspection.status === "reviewed";
  const canEdit = !isLocked && (inspection.assigned_to === userId || userRole === "admin" || userRole === "dispatcher");

  async function updateItem(itemId: string, updates: Partial<Pick<Item, "response_text" | "is_completed">>) {
    if (!canEdit) return;
    setSaving(itemId);
    setError(null);
    try {
      const { error: err } = await supabase
        .from("inspection_checklist_items")
        .update(updates)
        .eq("id", itemId)
        .eq("company_id", companyId);

      if (err) throw err;
      setLocalItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, ...updates } : i))
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  }

  async function handleSubmit() {
    if (!canEdit) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from("inspections")
        .update({
          status: "submitted",
          submitted_by: userId,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", inspection.id)
        .eq("company_id", companyId);

      if (err) throw err;
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      {isLocked && (
        <div
          style={{
            padding: 8,
            marginBottom: 12,
            background: "#fef3c7",
            color: "#92400e",
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          This inspection is {inspection.status}. No further edits.
        </div>
      )}

      <div style={{ fontWeight: 800, marginBottom: 8 }}>Checklist</div>
      <div className="stack" style={{ gap: 12 }}>
        {localItems.map((item) => (
          <div key={item.id} style={{ padding: 8, border: "1px solid #e5e7eb", borderRadius: 6 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{item.label_snapshot}</div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <input
                type="checkbox"
                checked={item.is_completed}
                onChange={(e) => updateItem(item.id, { is_completed: e.target.checked })}
                disabled={!canEdit || saving === item.id}
              />
              <span className="muted" style={{ fontSize: 13 }}>Completed</span>
            </label>
            <textarea
              value={item.response_text ?? ""}
              onChange={(e) => updateItem(item.id, { response_text: e.target.value || null })}
              placeholder="Notes…"
              disabled={!canEdit || saving === item.id}
              rows={2}
              style={{ width: "100%", fontSize: 13, padding: 6 }}
            />
            {saving === item.id && <span className="muted" style={{ fontSize: 12 }}>Saving…</span>}
          </div>
        ))}
      </div>

      {error && (
        <div className="muted" style={{ color: "#b91c1c", marginTop: 8 }}>
          {error}
        </div>
      )}

      {canEdit && (
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? t("common.submitting") : t("inspection.submitInspection")}
          </button>
        </div>
      )}
    </div>
  );
}
