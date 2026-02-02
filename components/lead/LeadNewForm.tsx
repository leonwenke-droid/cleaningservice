"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from 'next-intl';

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  companyId: string;
  createdBy: string;
};

export function LeadNewForm({ companyId, createdBy }: Props) {
  const t = useTranslations();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [objectType, setObjectType] = useState("unterhaltsreinigung");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCreatedLeadId(null);

    try {
      const customerId = crypto.randomUUID();
      const siteId = crypto.randomUUID();
      const leadId = crypto.randomUUID();

      const { error: customerErr } = await supabase.from("customers").insert({
        id: customerId,
        company_id: companyId,
        name: customerName.trim(),
        phone: customerPhone.trim() || null
      });
      if (customerErr) throw customerErr;

      const { error: siteErr } = await supabase.from("sites").insert({
        id: siteId,
        company_id: companyId,
        customer_id: customerId,
        name: "Objekt",
        address_line1: siteAddress.trim()
      });
      if (siteErr) throw siteErr;

      const { error: leadErr } = await supabase.from("leads").insert({
        id: leadId,
        company_id: companyId,
        customer_id: customerId,
        site_id: siteId,
        source: "web",
        title: t(`objectTypes.${objectType}`),
        description: notes.trim() || null,
        status: "new",
        created_by: createdBy
      });
      if (leadErr) throw leadErr;

      setCreatedLeadId(leadId);
    } catch (err: any) {
      setError(err?.message ?? t('lead.failedToCreate'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <div>
        <div className="label">{t('lead.customerName')}</div>
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder={t('lead.customerNamePlaceholder')}
          required
        />
      </div>
      <div>
        <div className="label">{t('lead.customerPhone')}</div>
        <input
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder={t('lead.customerPhonePlaceholder')}
        />
      </div>
      <div>
        <div className="label">{t('lead.siteAddress')}</div>
        <textarea
          value={siteAddress}
          onChange={(e) => setSiteAddress(e.target.value)}
          placeholder={t('lead.siteAddressPlaceholder')}
          required
        />
      </div>
      <div>
        <div className="label">{t('lead.objectType')}</div>
        <select value={objectType} onChange={(e) => setObjectType(e.target.value)}>
          <option value="unterhaltsreinigung">{t('objectTypes.unterhaltsreinigung')}</option>
          <option value="grundreinigung">{t('objectTypes.grundreinigung')}</option>
          <option value="fensterreinigung">{t('objectTypes.fensterreinigung')}</option>
          <option value="bauendreinigung">{t('objectTypes.bauendreinigung')}</option>
          <option value="sonderreinigung">{t('objectTypes.sonderreinigung')}</option>
        </select>
        <div className="muted" style={{ marginTop: 6 }}>
          {t('lead.objectTypeStored')}
        </div>
      </div>
      <div>
        <div className="label">{t('lead.notes')}</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('lead.notesPlaceholder')}
        />
      </div>

      {error ? <div className="muted">{error}</div> : null}

      <button className="btn" disabled={loading}>
        {loading ? t('common.creating') : t('lead.create')}
      </button>

      {createdLeadId ? (
        <div className="card" style={{ background: "#f9fafb" }}>
          <div style={{ fontWeight: 800 }}>{t('lead.created')}</div>
          <div className="muted" style={{ wordBreak: "break-all" }}>
            {createdLeadId}
          </div>
          <div style={{ marginTop: 10 }}>
            <Link className="btn secondary" href="/">
              {t('lead.backToDashboard')}
            </Link>
          </div>
        </div>
      ) : null}
    </form>
  );
}

