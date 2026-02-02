-- 0005_fix_user_fk_set_null.sql
-- Fix composite FK ON DELETE SET NULL issues for user references.
--
-- Problem:
-- We previously used composite FKs like (company_id, assigned_to) -> app_users(company_id, id)
-- with ON DELETE SET NULL. Postgres will set *all referencing columns* to NULL, including
-- company_id, which violates NOT NULL constraints on many tables (e.g. inspections.company_id).
--
-- Solution:
-- - Replace those composite FKs with single-column FKs to app_users(id) ON DELETE SET NULL.
-- - Add triggers to ensure referenced user IDs belong to the same company.

-- =========================
-- Drop + recreate FKs to app_users (single-column)
-- =========================

alter table public.leads
  drop constraint if exists leads_created_by_fk;
alter table public.leads
  add constraint leads_created_by_fk
  foreign key (created_by)
  references public.app_users(id)
  on delete set null;

-- Inspections.assigned_to / submitted_by
alter table public.inspections
  drop constraint if exists inspections_assigned_to_fk;
alter table public.inspections
  add constraint inspections_assigned_to_fk
  foreign key (assigned_to)
  references public.app_users(id)
  on delete set null;

alter table public.inspections
  drop constraint if exists inspections_submitted_by_fk;
alter table public.inspections
  add constraint inspections_submitted_by_fk
  foreign key (submitted_by)
  references public.app_users(id)
  on delete set null;

-- Tickets.assigned_to / created_by
alter table public.tickets
  drop constraint if exists tickets_assigned_to_fk;
alter table public.tickets
  add constraint tickets_assigned_to_fk
  foreign key (assigned_to)
  references public.app_users(id)
  on delete set null;

alter table public.tickets
  drop constraint if exists tickets_created_by_fk;
alter table public.tickets
  add constraint tickets_created_by_fk
  foreign key (created_by)
  references public.app_users(id)
  on delete set null;

-- =========================
-- Enforce "user belongs to same company" via triggers
-- =========================

create or replace function public._assert_user_in_company(p_company_id uuid, p_user_id uuid, p_field text)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if p_user_id is null then
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

create or replace function public.trg_leads_user_company_match()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  perform public._assert_user_in_company(new.company_id, new.created_by, 'created_by');
  return new;
end;
$$;

drop trigger if exists trg_leads_user_company_match on public.leads;
create trigger trg_leads_user_company_match
before insert or update of company_id, created_by
on public.leads
for each row
execute function public.trg_leads_user_company_match();

create or replace function public.trg_inspections_user_company_match()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  perform public._assert_user_in_company(new.company_id, new.assigned_to, 'assigned_to');
  perform public._assert_user_in_company(new.company_id, new.submitted_by, 'submitted_by');
  return new;
end;
$$;

drop trigger if exists trg_inspections_user_company_match on public.inspections;
create trigger trg_inspections_user_company_match
before insert or update of company_id, assigned_to, submitted_by
on public.inspections
for each row
execute function public.trg_inspections_user_company_match();

create or replace function public.trg_tickets_user_company_match()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  perform public._assert_user_in_company(new.company_id, new.assigned_to, 'assigned_to');
  perform public._assert_user_in_company(new.company_id, new.created_by, 'created_by');
  return new;
end;
$$;

drop trigger if exists trg_tickets_user_company_match on public.tickets;
create trigger trg_tickets_user_company_match
before insert or update of company_id, assigned_to, created_by
on public.tickets
for each row
execute function public.trg_tickets_user_company_match();

