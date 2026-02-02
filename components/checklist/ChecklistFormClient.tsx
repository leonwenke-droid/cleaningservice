"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChecklistForm } from "./ChecklistForm";

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
  description: string | null;
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
  inspectionStatus: "open" | "in_progress" | "submitted" | "reviewed";
};

const statusKeyMap: Record<string, string> = {
  open: "open",
  in_progress: "inProgress",
  submitted: "submitted",
  reviewed: "reviewed",
};

export function ChecklistFormClient(props: Props) {
  const t = useTranslations();
  const [isLocked, setIsLocked] = useState(
    props.inspectionStatus === "submitted" || props.inspectionStatus === "reviewed"
  );

  // If locked, show read-only view
  if (isLocked) {
    const statusLabel = t(`inspection.statusValues.${statusKeyMap[props.inspectionStatus] ?? props.inspectionStatus}` as "inspection.statusValues.open");
    return (
      <div className="card">
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            background: "#fef3c7",
            color: "#92400e",
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          {t("inspection.lockedMessage", { status: statusLabel })}
        </div>
        <div className="muted">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{t("inspection.templateInfo", { name: props.template.name })}</div>
          <div style={{ fontSize: 13 }}>
            {t("inspection.versionInfo", { version: props.template.version_number, count: props.template.items.length })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ChecklistForm
      inspectionId={props.inspectionId}
      companyId={props.companyId}
      userId={props.userId}
      userRole={props.userRole}
      template={props.template}
      existingResponses={props.existingResponses}
      existingFiles={props.existingFiles}
    />
  );
}
