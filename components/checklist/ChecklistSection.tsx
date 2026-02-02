"use client";

import { useTranslations } from "next-intl";
import { ChecklistItemField } from "./ChecklistItemField";

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

type FileInfo = {
  id: string;
  checklist_item_id: string | null;
  storage_path: string;
  file_name: string;
};

type Props = {
  section: ChecklistItem["section"];
  items: ChecklistItem[];
  responses: Record<string, any>;
  files: FileInfo[];
  errors: Record<string, string>;
  onUpdate: (itemId: string, value: any) => void;
  onFileUpload: (itemId: string | null, file: File) => void;
  onFileDelete: (fileId: string) => void;
};

export function ChecklistSection({
  section,
  items,
  responses,
  files,
  errors,
  onUpdate,
  onFileUpload,
  onFileDelete,
}: Props) {
  const t = useTranslations();

  return (
    <div className="stack" style={{ gap: 16 }}>
      {items.length === 0 ? (
        <div className="card muted">
          <div>{t("checklist.noItemsInSection")}</div>
        </div>
      ) : (
        items.map((item) => {
          const value = responses[item.id];
          const itemFiles = files.filter((f) => f.checklist_item_id === item.id);
          const error = errors[item.id];

          return (
            <div key={item.id} className="card">
              <ChecklistItemField
                item={item}
                value={value}
                error={error}
                files={itemFiles}
                onUpdate={(newValue) => onUpdate(item.id, newValue)}
                onFileUpload={(file) => onFileUpload(item.id, file)}
                onFileDelete={onFileDelete}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
