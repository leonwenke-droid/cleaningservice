-- 0006_lead_delete_and_trigger_fix.sql
-- 1) When deleting a lead, composite FK (company_id, lead_id) ON DELETE SET NULL
--    sets BOTH columns to null on inspections/tickets/message_log, violating NOT NULL on company_id.
--    Fix: single-column FKs so only lead_id is set null.
-- 2) When cascade sets company_id = null, trigger _assert_user_in_company(null, assigned_to, ...)
--    raises "assigned_to must belong to same company". Fix: return early when p_company_id is null.

-- =========================
-- Fix _assert_user_in_company: skip check when company_id is null (e.g. cascade from lead delete)
-- =========================
create or replace function public._assert_user_in_company(p_company_id uuid, p_user_id uuid, p_field text)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if p_company_id is null or p_user_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.app_users au
    where au.id = p_user_id
      and au.company_id = p_company_id
  ) then
    raise exception '% must belong to same company', p_field;
  end if;
end;
$$;

-- =========================
-- Fix FKs to leads: single-column so ON DELETE SET NULL only nulls lead_id, not company_id
-- =========================

-- Inspections.lead_id
alter table public.inspections
  drop constraint if exists inspections_lead_fk;
alter table public.inspections
  add constraint inspections_lead_fk
  foreign key (lead_id)
  references public.leads(id)
  on delete set null;

-- Quotes.lead_id
alter table public.quotes
  drop constraint if exists quotes_lead_fk;
alter table public.quotes
  add constraint quotes_lead_fk
  foreign key (lead_id)
  references public.leads(id)
  on delete set null;

-- Tickets.lead_id
alter table public.tickets
  drop constraint if exists tickets_lead_fk;
alter table public.tickets
  add constraint tickets_lead_fk
  foreign key (lead_id)
  references public.leads(id)
  on delete set null;

-- Message_log.related_lead_id
alter table public.message_log
  drop constraint if exists message_log_lead_fk;
alter table public.message_log
  add constraint message_log_lead_fk
  foreign key (related_lead_id)
  references public.leads(id)
  on delete set null;
