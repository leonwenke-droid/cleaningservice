"use client";

import type { FormEvent } from "react";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type CompanyUser = {
  id: string;
  full_name: string | null;
  role: "admin" | "dispatcher" | "worker";
};

type Props = {
  companyId: string;
  userId: string;
  leadId: string | null;
  siteId: string | null;
  companyUsers: CompanyUser[];
};

export function CreateInspectionForm({ companyId, userId, leadId, siteId, companyUsers }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState(userId);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEmails() {
      try {
        const response = await fetch(`/api/admin/users?company_id=${companyId}`, {
          credentials: "include",
        });
        const data = await response.json();
        if ((data as { users?: Array<{ id: string; email?: string }> }).users) {
          const emailMap: Record<string, string> = {};
          (data as { users: Array<{ id: string; email?: string }> }).users.forEach((u) => {
            if (u.email) emailMap[u.id] = u.email;
          });
          setUserEmails(emailMap);
        }
      } catch {
        // Silently fail - emails are nice-to-have
      }
    }
    fetchEmails();
  }, [companyId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get active checklist template version
      const { data: templateData, error: templateError } = await supabase
        .from("checklist_template_versions")
        .select("id")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (templateError) {
        console.error("Error fetching checklist template:", templateError);
      }
      
      if (!templateData) {
        setError(t('inspection.noActiveTemplate'));
        setLoading(false);
        return;
      }

      // Get site info for snapshot (if site_id exists)
      let siteNameSnapshot = null;
      let siteAddressSnapshot = null;
      if (siteId) {
        const { data: siteData } = await supabase
          .from("sites")
          .select("name, address_line1, address_line2, city")
          .eq("id", siteId)
          .eq("company_id", companyId)
          .single();
        
        if (siteData) {
          siteNameSnapshot = siteData.name;
          const addressParts = [
            siteData.address_line1,
            siteData.address_line2,
            siteData.city,
          ].filter(Boolean);
          siteAddressSnapshot = addressParts.join(", ");
        }
      }

      const inspectionId = crypto.randomUUID();

      const { error: insertErr } = await supabase.from("inspections").insert({
        id: inspectionId,
        company_id: companyId,
        lead_id: leadId,
        site_id: siteId,
        scheduled_at: scheduledAt || null,
        status: "open",
        assigned_to: assignedTo || userId,
        notes: notes.trim() || null,
        checklist_template_version_id: templateData?.id || null,
        site_name_snapshot: siteNameSnapshot,
        site_address_snapshot: siteAddressSnapshot,
      });

      if (insertErr) throw insertErr;

      router.push(`/inspection/${inspectionId}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('inspection.failedToCreate'));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <div>
        <div className="label">{t('inspection.scheduledDateTime')}</div>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
      </div>

      <div>
        <div className="label">{t('inspection.assignedToLabel')}</div>
        {companyUsers.length > 0 ? (
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            required
          >
            {companyUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name || userEmails[user.id] || t('common.unknown')} ({t(`common.${user.role}`)})
                {user.id === userId ? ` (${t('common.you')})` : ""}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder={userId}
            required
          />
        )}
        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
          {companyUsers.length > 0
            ? t('inspection.selectUserDescription')
            : t('inspection.enterUserId')}
        </div>
      </div>

      <div>
        <div className="label">{t('inspection.notesLabel')}</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('inspection.notesPlaceholder')}
        />
      </div>

      {leadId ? (
        <div className="muted" style={{ fontSize: 13 }}>
          {t('inspection.linkedToLead')}: {leadId.slice(0, 8)}…
        </div>
      ) : null}

      {error ? <div className="muted" style={{ color: "#b91c1c" }}>{error}</div> : null}

      <button className="btn" disabled={loading}>
        {loading ? t('common.creating') : t('inspection.create')}
      </button>
    </form>
  );
}
