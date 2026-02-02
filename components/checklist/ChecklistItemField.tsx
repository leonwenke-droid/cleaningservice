"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

type ChecklistItem = {
  id: string;
  item_key: string;
  label: string;
  help_text: string | null;
  item_type: "rating" | "boolean" | "enum" | "integer" | "text" | "textarea" | "timestamp" | "multi_select";
  required: boolean;
  validation_rules: Record<string, any>;
  enum_options: Array<{ value: string; label: string }> | null;
};

type FileInfo = {
  id: string;
  file_name: string;
};

type Props = {
  item: ChecklistItem;
  value: any;
  error?: string;
  files: FileInfo[];
  onUpdate: (value: any) => void;
  onFileUpload: (file: File) => void;
  onFileDelete: (fileId: string) => void;
};

export function ChecklistItemField({
  item,
  value,
  error,
  files,
  onUpdate,
  onFileUpload,
  onFileDelete,
}: Props) {
  const t = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const camelKey = snakeToCamel(item.item_key);
  const itemLabelKey = `inspection.items.${camelKey}` as "inspection.items.arrivalTime";
  let displayLabel: string;
  try {
    const translated = t(itemLabelKey);
    displayLabel = translated && typeof translated === "string" && !translated.startsWith("inspection.items.") ? translated : item.label;
  } catch {
    displayLabel = item.label;
  }

  let displayHelp: string | null = null;
  if (item.help_text) {
    try {
      const helpKey = `inspection.help.${camelKey}` as "inspection.help.arrivalTime";
      const translated = t(helpKey);
      displayHelp = typeof translated === "string" && !translated.startsWith("inspection.help.") ? translated : item.help_text;
    } catch {
      displayHelp = item.help_text;
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  // Check if photo is required (score <= 2)
  const isScoreItem = item.item_key.endsWith("_score") && item.item_type === "rating";
  const requiresPhoto = isScoreItem && typeof value === "number" && value <= 2;

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div>
        <label className="label" style={{ fontWeight: item.required ? 700 : 600 }}>
          {displayLabel}
          {item.required && <span style={{ color: "#b91c1c" }}> *</span>}
        </label>
        {displayHelp && (
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            {displayHelp}
          </div>
        )}
      </div>

      {/* Render field based on type */}
      {item.item_type === "rating" && (
        <RatingField
          item={item}
          value={value}
          onChange={onUpdate}
          t={t}
        />
      )}

      {item.item_type === "boolean" && (
        <BooleanField
          item={item}
          value={value}
          onChange={onUpdate}
          t={t}
        />
      )}

      {item.item_type === "enum" && (
        <EnumField
          item={item}
          value={value}
          onChange={onUpdate}
          t={t}
          optionsKey={camelKey}
        />
      )}

      {item.item_type === "multi_select" && (
        <MultiSelectField
          item={item}
          value={value}
          onChange={onUpdate}
          t={t}
          optionsKey={camelKey}
        />
      )}

      {item.item_type === "integer" && (
        <IntegerField
          item={item}
          value={value}
          onChange={onUpdate}
          t={t}
        />
      )}

      {item.item_type === "text" && (
        <TextField
          item={item}
          value={value}
          onChange={onUpdate}
          t={t}
        />
      )}

      {item.item_type === "textarea" && (
        <TextareaField
          item={item}
          value={value}
          onChange={onUpdate}
          t={t}
        />
      )}

      {item.item_type === "timestamp" && (
        <TimestampField
          item={item}
          value={value}
          onChange={onUpdate}
          t={t}
        />
      )}

      {/* Error message */}
      {error && (
        <div className="muted" style={{ color: "#b91c1c", fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* Photo upload (required for scores <= 2) */}
      {(requiresPhoto || item.item_key === "deviation_reason") && (
        <div style={{ marginTop: 8 }}>
          <div className="label" style={{ fontSize: 13 }}>
            {requiresPhoto ? t("checklist.photoRequired") : t("checklist.photoOptional")}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            style={{ fontSize: 14, padding: 8 }}
          />
          {files.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {files.map((file) => (
                <div
                  key={file.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: 6,
                    background: "#f3f4f6",
                    borderRadius: 4,
                    marginTop: 4,
                  }}
                >
                  <span style={{ fontSize: 12 }}>{file.file_name}</span>
                  <button
                    type="button"
                    onClick={() => onFileDelete(file.id)}
                    style={{
                      marginLeft: "auto",
                      fontSize: 12,
                      color: "#b91c1c",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {t("checklist.remove")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type TFunction = (key: string, values?: Record<string, string | number>) => string;

// Rating field (1-5 scale) – always use translated labels, ignore DB enum_options
function RatingField({ item, value, onChange, t }: { item: ChecklistItem; value: any; onChange: (v: any) => void; t: TFunction }) {
  const labels = [t("checklist.rating1"), t("checklist.rating2"), t("checklist.rating3"), t("checklist.rating4"), t("checklist.rating5")];
  const values = [1, 2, 3, 4, 5];

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {values.map((val, idx) => {
        const isSelected = value === val;
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className="btn"
            style={{
              backgroundColor: isSelected ? "#3b82f6" : "#f3f4f6",
              color: isSelected ? "white" : "#374151",
              border: `1px solid ${isSelected ? "#3b82f6" : "#d1d5db"}`,
              minWidth: 80,
              fontSize: 14,
            }}
          >
            {labels[idx]}
          </button>
        );
      })}
    </div>
  );
}

// Boolean field (yes/no)
function BooleanField({ item, value, onChange, t }: { item: ChecklistItem; value: any; onChange: (v: any) => void; t: TFunction }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        type="button"
        onClick={() => onChange(true)}
        className="btn"
        style={{
          backgroundColor: value === true ? "#10b981" : "#f3f4f6",
          color: value === true ? "white" : "#374151",
          flex: 1,
        }}
      >
        {t("common.yes")}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className="btn"
        style={{
          backgroundColor: value === false ? "#ef4444" : "#f3f4f6",
          color: value === false ? "white" : "#374151",
          flex: 1,
        }}
      >
        {t("common.no")}
      </button>
    </div>
  );
}

// Enum field (dropdown)
function EnumField({ item, value, onChange, t, optionsKey }: { item: ChecklistItem; value: any; onChange: (v: any) => void; t: TFunction; optionsKey: string }) {
  const options = item.enum_options || [];

  function optionLabel(opt: { value: string; label: string }): string {
    const val = String(opt.value);
    try {
      const key = `inspection.options.${optionsKey}.${val}` as "inspection.options.teamSize.1";
      const translated = t(key);
      return typeof translated === "string" && !translated.startsWith("inspection.options.") ? translated : opt.label;
    } catch {
      return opt.label;
    }
  }

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", padding: 8, fontSize: 14 }}
    >
      <option value="">{t("checklist.select")}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {optionLabel(opt)}
        </option>
      ))}
    </select>
  );
}

// Multi-select field
function MultiSelectField({ item, value, onChange, t, optionsKey }: { item: ChecklistItem; value: any; onChange: (v: any) => void; t: TFunction; optionsKey: string }) {
  const options = item.enum_options || [];
  const selectedValues = Array.isArray(value) ? value : [];

  function optionLabel(opt: { value: string; label: string }): string {
    const val = String(opt.value);
    try {
      const key = `inspection.options.${optionsKey}.${val}` as "inspection.options.extraTasksPerformed.extra_waste";
      const translated = t(key);
      return typeof translated === "string" && !translated.startsWith("inspection.options.") ? translated : opt.label;
    } catch {
      return opt.label;
    }
  }

  function toggleOption(optValue: string) {
    const newValues = selectedValues.includes(optValue)
      ? selectedValues.filter((v) => v !== optValue)
      : [...selectedValues, optValue];
    onChange(newValues);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {options.map((opt) => {
        const isSelected = selectedValues.includes(opt.value);
        return (
          <label
            key={opt.value}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: 8,
              background: isSelected ? "#dbeafe" : "#f9fafb",
              border: `1px solid ${isSelected ? "#3b82f6" : "#e5e7eb"}`,
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleOption(opt.value)}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ fontSize: 14 }}>{optionLabel(opt)}</span>
          </label>
        );
      })}
    </div>
  );
}

// Integer field
function IntegerField({ item, value, onChange, t }: { item: ChecklistItem; value: any; onChange: (v: any) => void; t: TFunction }) {
  const min = item.validation_rules?.min ?? 0;
  const max = item.validation_rules?.max;
  const placeholder =
    t("checklist.enterNumber") +
    (min !== undefined && min !== null ? t("checklist.minHint", { min }) : "") +
    (max !== undefined && max !== null ? t("checklist.maxHint", { max }) : "");
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) => {
        const num = e.target.value === "" ? null : parseInt(e.target.value);
        if (num !== null && (!isNaN(num) && (min === undefined || num >= min) && (max === undefined || num <= max))) {
          onChange(num);
        } else if (num === null) {
          onChange(null);
        }
      }}
      min={min}
      max={max}
      placeholder={placeholder}
      style={{ width: "100%", padding: 8, fontSize: 14 }}
    />
  );
}

// Text field
function TextField({ item, value, onChange, t }: { item: ChecklistItem; value: any; onChange: (v: any) => void; t: TFunction }) {
  const maxLength = item.validation_rules?.max_length;

  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={(e) => {
        const text = e.target.value;
        if (!maxLength || text.length <= maxLength) {
          onChange(text || null);
        }
      }}
      maxLength={maxLength}
      placeholder={maxLength ? t("checklist.maxCharacters", { max: maxLength }) : t("checklist.enterText")}
      style={{ width: "100%", padding: 8, fontSize: 14 }}
    />
  );
}

// Textarea field
function TextareaField({ item, value, onChange, t }: { item: ChecklistItem; value: any; onChange: (v: any) => void; t: TFunction }) {
  const maxLength = item.validation_rules?.max_length;

  return (
    <textarea
      value={value ?? ""}
      onChange={(e) => {
        const text = e.target.value;
        if (!maxLength || text.length <= maxLength) {
          onChange(text || null);
        }
      }}
      maxLength={maxLength}
      rows={3}
      placeholder={maxLength ? t("checklist.maxCharacters", { max: maxLength }) : t("checklist.enterText")}
      style={{ width: "100%", padding: 8, fontSize: 14, fontFamily: "inherit" }}
    />
  );
}

// Timestamp field (button to record current time)
function TimestampField({ item, value, onChange, t }: { item: ChecklistItem; value: any; onChange: (v: any) => void; t: TFunction }) {
  const timestamp = value ? new Date(value) : null;

  return (
    <div>
      <button
        type="button"
        onClick={() => onChange(new Date().toISOString())}
        className="btn"
        style={{ width: "100%", fontSize: 16, padding: 12 }}
      >
        {timestamp
          ? `${t("checklist.recorded")}: ${timestamp.toLocaleString(undefined, {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : t("checklist.tapToRecordTime")}
      </button>
      {timestamp && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="btn secondary"
          style={{ width: "100%", marginTop: 8, fontSize: 12 }}
        >
          {t("checklist.clear")}
        </button>
      )}
    </div>
  );
}
