"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChecklistSection } from "./ChecklistSection";

type ChecklistItem = {
  id: string;
  section: "meta" | "core_quality" | "modules" | "extras" | "finalization";
  sort_order: number;
  item_key: string;
  label: string;
  help_text: string | null;
  item_type: "rating" | "boolean" | "enum" | "integer" | "text" | "textarea" | "timestamp" | "multi_select";
  required: boolean;
  validation_rules: Record<string, any>;
  conditional_logic: Record<string, any>;
  enum_options: Array<{ value: string; label: string }> | null;
  default_value: any;
};

type ChecklistTemplate = {
  id: string;
  version_number: number;
  name: string;
  items: ChecklistItem[];
};

type Props = {
  inspectionId: string;
  companyId: string;
  userId: string;
  userRole: "admin" | "dispatcher" | "worker";
  template: ChecklistTemplate;
  existingResponses?: Record<string, any>;
  existingFiles?: Array<{ id: string; checklist_item_id: string | null; storage_path: string; file_name: string }>;
};

const SECTION_KEYS: Array<ChecklistItem["section"]> = [
  "meta",
  "core_quality",
  "modules",
  "extras",
  "finalization",
];

const SECTION_TRANSLATION_KEYS: Record<string, string> = {
  meta: "meta",
  core_quality: "coreQuality",
  modules: "modules",
  extras: "extras",
  finalization: "finalization",
};

export function ChecklistForm({
  inspectionId,
  companyId,
  userId,
  userRole,
  template,
  existingResponses = {},
  existingFiles = [],
}: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>(existingResponses);
  const [files, setFiles] = useState(existingFiles);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Group items by section
  const itemsBySection = useMemo(() => {
    const grouped: Record<string, ChecklistItem[]> = {
      meta: [],
      core_quality: [],
      modules: [],
      extras: [],
      finalization: [],
    };

    (template.items || []).forEach((item) => {
      if (grouped[item.section]) {
        grouped[item.section].push(item);
      }
    });

    // Sort items within each section
    Object.keys(grouped).forEach((section) => {
      grouped[section].sort((a, b) => a.sort_order - b.sort_order);
    });

    return grouped;
  }, [template.items]);

  // Auto-save responses
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (Object.keys(responses).length > 0) {
        saveResponses();
      }
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timeoutId);
  }, [responses]);

  async function saveResponses() {
    if (saving) return;

    setSaving(true);
    try {
      // Filter out null/undefined values - only save responses that have actual values
      const responseData = Object.entries(responses)
        .filter(([_, value]) => value !== null && value !== undefined && value !== "")
        .map(([checklist_item_id, value]) => ({
          checklist_item_id,
          value: typeof value === "object" ? value : value,
        }));

      // Don't send empty array
      if (responseData.length === 0) {
        setSaving(false);
        return;
      }

      const response = await fetch("/api/checklist/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspection_id: inspectionId,
          responses: responseData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }
    } catch (err) {
      console.error("Error saving responses:", err);
      // Don't show error for auto-save failures
    } finally {
      setSaving(false);
    }
  }

  function updateResponse(itemId: string, value: any) {
    setResponses((prev) => {
      const next = { ...prev };
      // If value is null/undefined/empty, remove it from responses instead of setting to null
      if (value === null || value === undefined || value === "") {
        delete next[itemId];
      } else {
        next[itemId] = value;
      }
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }

  function handleFileUpload(itemId: string | null, file: File) {
    const formData = new FormData();
    formData.append("inspection_id", inspectionId);
    formData.append("file", file);
    if (itemId) {
      formData.append("checklist_item_id", itemId);
    }

    fetch("/api/checklist/files", {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.file) {
          setFiles((prev) => [
            ...prev,
            {
              id: data.file.id,
              checklist_item_id: itemId,
              storage_path: data.file.storage_path,
              file_name: data.file.file_name,
            },
          ]);
        }
      })
      .catch((err) => {
        console.error("Error uploading file:", err);
      });
  }

  function handleFileDelete(fileId: string) {
    fetch(`/api/checklist/files?id=${fileId}`, {
      method: "DELETE",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setFiles((prev) => prev.filter((f) => f.id !== fileId));
        }
      })
      .catch((err) => {
        console.error("Error deleting file:", err);
      });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setErrors({});

    try {
      // Validate before submit
      const validationResponse = await fetch("/api/checklist/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inspection_id: inspectionId }),
      });

      const validation = await validationResponse.json();

      if (!validation.valid) {
        // Map validation errors to form errors
        const newErrors: Record<string, string> = {};
        validation.errors.forEach((err: any) => {
          // Find item by item_key
          const item = template.items.find((i) => i.item_key === err.item_key);
          if (item) {
            newErrors[item.id] = err.error;
          }
        });
        setErrors(newErrors);

        // Scroll to first error
        if (validation.errors.length > 0) {
          const firstError = validation.errors[0];
          const item = template.items.find((i) => i.item_key === firstError.item_key);
          if (item) {
            // Find which section contains this item
            const sectionIndex = SECTION_KEYS.findIndex((s) => s === item.section);
            if (sectionIndex >= 0) {
              setCurrentSection(sectionIndex);
            }
          }
        }

        setSubmitting(false);
        return;
      }

      // Submit inspection
      const submitResponse = await fetch(`/api/inspections/${inspectionId}/submit`, {
        method: "POST",
      });

      if (!submitResponse.ok) {
        const data = await submitResponse.json();
        throw new Error(data.error || "Failed to submit");
      }

      router.refresh();
      router.push(`/inspection/${inspectionId}`);
    } catch (err: unknown) {
      console.error("Error submitting inspection:", err);
      setErrors({
        submit: err instanceof Error ? err.message : "Failed to submit inspection",
      });
      setSubmitting(false);
    }
  }

  const currentSectionKey = SECTION_KEYS[currentSection];
  const currentItems = itemsBySection[currentSectionKey] || [];

  return (
    <div className="stack" style={{ gap: 16 }}>
      {/* Progress indicator */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
        {SECTION_KEYS.map((sectionKey, idx) => (
          <button
            key={sectionKey}
            type="button"
            onClick={() => setCurrentSection(idx)}
            className="pill"
            style={{
              backgroundColor: idx === currentSection ? "#3b82f6" : "#f3f4f6",
              color: idx === currentSection ? "white" : "#374151",
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontSize: 13,
            }}
          >
            {idx + 1}. {t(`inspection.sections.${SECTION_TRANSLATION_KEYS[sectionKey]}` as "inspection.sections.meta")}
          </button>
        ))}
      </div>

      {/* Current section */}
      <ChecklistSection
        section={currentSectionKey}
        items={currentItems}
        responses={responses}
        files={files.filter((f) => !f.checklist_item_id || currentItems.some((i) => i.id === f.checklist_item_id))}
        errors={errors}
        onUpdate={updateResponse}
        onFileUpload={handleFileUpload}
        onFileDelete={handleFileDelete}
      />

      {/* Navigation */}
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 16 }}>
        <button
          type="button"
          className="btn secondary"
          onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
          disabled={currentSection === 0}
        >
          {t("common.previous")}
        </button>

        {currentSection < SECTION_KEYS.length - 1 ? (
          <button
            type="button"
            className="btn"
            onClick={() => setCurrentSection(Math.min(SECTION_KEYS.length - 1, currentSection + 1))}
          >
            {t("common.next")}
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? t("common.submitting") : t("inspection.submitInspection")}
          </button>
        )}
      </div>

      {saving && (
        <div className="muted" style={{ fontSize: 12, textAlign: "center" }}>
          {t("common.saving")}
        </div>
      )}

      {errors.submit && (
        <div className="muted" style={{ color: "#b91c1c", fontSize: 13 }}>
          {errors.submit}
        </div>
      )}
    </div>
  );
}
