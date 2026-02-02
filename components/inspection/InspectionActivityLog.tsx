"use client";

import { useState, useEffect, useMemo } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  inspectionId: string;
  companyId: string;
};

type LogEntry = {
  id: string;
  action: string;
  old_status: string | null;
  new_status: string | null;
  performed_by: string | null;
  created_at: string;
};

export function InspectionActivityLog({ inspectionId, companyId }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from("inspection_activity_log")
          .select("id, action, old_status, new_status, performed_by, created_at")
          .eq("inspection_id", inspectionId)
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) {
          if (error.code === "42P01") return; // relation does not exist
          console.warn("Activity log load error:", error.message);
          return;
        }
        setEntries((data as LogEntry[]) ?? []);
      } catch {
        // Table may not exist (migration not applied)
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [inspectionId, companyId, supabase]);

  if (loading) return null;
  if (entries.length === 0) return null;

  return (
    <div className="card">
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Activity</div>
      <div className="stack" style={{ gap: 6 }}>
        {entries.map((e) => (
          <div key={e.id} className="muted" style={{ fontSize: 12 }}>
            {e.action}
            {e.old_status && e.new_status && `: ${e.old_status} → ${e.new_status}`}
            {" · "}
            {new Date(e.created_at).toLocaleString("de-DE")}
          </div>
        ))}
      </div>
    </div>
  );
}
