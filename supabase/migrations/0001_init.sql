-- 0001_init.sql
-- Multi-tenant Cleaning Infrastructure MVP (Supabase Postgres)

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'dispatcher', 'worker');
  end if;

  if not exists (select 1 from pg_type where typname = 'lead_status') then
    create type public.lead_status as enum (
      'new',
      'qualifying',
      'qualified',
      'inspection_scheduled',
      'inspected',
      'quoted',
      'won',
      'lost'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'inspection_status') then
    create type public.inspection_status as enum (
      'open',
      'in_progress',
      'submitted',
      'reviewed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'ticket_status') then
    create type public.ticket_status as enum (
      'open',
      'assigned',
      'resolved',
      'closed'
    );
  end if;
end $$;

-- Generic updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Companies (tenant root)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

-- App users (maps Supabase auth.users to tenant + role)
create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role public.app_role not null default 'worker',
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_users_company_id_id_uniq unique (company_id, id)
);

create index if not exists idx_app_users_company_id on public.app_users(company_id);
create index if not exists idx_app_users_role on public.app_users(company_id, role);

create trigger trg_app_users_set_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

-- Helper functions for RLS (SECURITY DEFINER to avoid recursion)
create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select au.company_id
  from public.app_users au
  where au.id = auth.uid();
$$;

create or replace function public.is_member_of_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users au
    where au.id = auth.uid()
      and au.company_id = p_company_id
  );
$$;

create or replace function public.is_admin_of_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users au
    where au.id = auth.uid()
      and au.company_id = p_company_id
      and au.role = 'admin'
  );
$$;

-- Prevent non-admins from changing company_id/role on their own user row
create or replace function public.prevent_app_user_tenant_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.company_id is distinct from old.company_id) or (new.role is distinct from old.role) then
    if not public.is_admin_of_company(old.company_id) then
      raise exception 'Only admins can change company_id/role';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_app_users_prevent_tenant_role_change
before update on public.app_users
for each row execute function public.prevent_app_user_tenant_role_change();

-- Customers
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_company_id_id_uniq unique (company_id, id)
);

create index if not exists idx_customers_company_id on public.customers(company_id);
create index if not exists idx_customers_company_name on public.customers(company_id, name);

create trigger trg_customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

-- Sites (aka properties / locations)
create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null,
  name text not null,
  address_line1 text,
  address_line2 text,
  city text,
  postal_code text,
  country text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sites_company_id_id_uniq unique (company_id, id),
  constraint sites_customer_fk foreign key (company_id, customer_id)
    references public.customers(company_id, id) on delete cascade
);

create index if not exists idx_sites_company_id on public.sites(company_id);
create index if not exists idx_sites_customer_id on public.sites(company_id, customer_id);

create trigger trg_sites_set_updated_at
before update on public.sites
for each row execute function public.set_updated_at();

-- Leads
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid,
  site_id uuid,
  source text,
  title text,
  description text,
  status public.lead_status not null default 'new',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_company_id_id_uniq unique (company_id, id),
  constraint leads_customer_fk foreign key (company_id, customer_id)
    references public.customers(company_id, id) on delete set null,
  constraint leads_site_fk foreign key (company_id, site_id)
    references public.sites(company_id, id) on delete set null,
  constraint leads_created_by_fk foreign key (company_id, created_by)
    references public.app_users(company_id, id) on delete set null
);

create index if not exists idx_leads_company_id on public.leads(company_id);
create index if not exists idx_leads_status on public.leads(company_id, status);
create index if not exists idx_leads_customer_id on public.leads(company_id, customer_id);
create index if not exists idx_leads_site_id on public.leads(company_id, site_id);

create trigger trg_leads_set_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

-- Inspections
create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lead_id uuid,
  site_id uuid,
  scheduled_at timestamptz,
  status public.inspection_status not null default 'open',
  assigned_to uuid,
  submitted_by uuid,
  submitted_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspections_company_id_id_uniq unique (company_id, id),
  constraint inspections_lead_fk foreign key (company_id, lead_id)
    references public.leads(company_id, id) on delete set null,
  constraint inspections_site_fk foreign key (company_id, site_id)
    references public.sites(company_id, id) on delete set null,
  constraint inspections_assigned_to_fk foreign key (company_id, assigned_to)
    references public.app_users(company_id, id) on delete set null,
  constraint inspections_submitted_by_fk foreign key (company_id, submitted_by)
    references public.app_users(company_id, id) on delete set null
);

create index if not exists idx_inspections_company_id on public.inspections(company_id);
create index if not exists idx_inspections_status on public.inspections(company_id, status);
create index if not exists idx_inspections_lead_id on public.inspections(company_id, lead_id);
create index if not exists idx_inspections_site_id on public.inspections(company_id, site_id);
create index if not exists idx_inspections_assigned_to on public.inspections(assigned_to);

create trigger trg_inspections_set_updated_at
before update on public.inspections
for each row execute function public.set_updated_at();

-- Checklist templates (per company)
create table if not exists public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checklist_templates_company_id_id_uniq unique (company_id, id)
);

create index if not exists idx_checklist_templates_company_id on public.checklist_templates(company_id);
create index if not exists idx_checklist_templates_active on public.checklist_templates(company_id, is_active);

create trigger trg_checklist_templates_set_updated_at
before update on public.checklist_templates
for each row execute function public.set_updated_at();

create table if not exists public.checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  checklist_template_id uuid not null,
  sort_order int not null default 0,
  label text not null,
  help_text text,
  required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checklist_template_items_company_id_id_uniq unique (company_id, id),
  constraint checklist_template_items_template_fk foreign key (company_id, checklist_template_id)
    references public.checklist_templates(company_id, id) on delete cascade
);

create index if not exists idx_checklist_template_items_company_id on public.checklist_template_items(company_id);
create index if not exists idx_checklist_template_items_template on public.checklist_template_items(company_id, checklist_template_id, sort_order);

create trigger trg_checklist_template_items_set_updated_at
before update on public.checklist_template_items
for each row execute function public.set_updated_at();

-- Inspection checklist responses (simple: text + optional photo path)
create table if not exists public.inspection_checklist_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  inspection_id uuid not null,
  checklist_template_item_id uuid,
  label_snapshot text not null,
  response_text text,
  is_completed boolean not null default false,
  photo_object_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspection_checklist_items_company_id_id_uniq unique (company_id, id),
  constraint inspection_checklist_items_inspection_fk foreign key (company_id, inspection_id)
    references public.inspections(company_id, id) on delete cascade,
  constraint inspection_checklist_items_template_item_fk foreign key (company_id, checklist_template_item_id)
    references public.checklist_template_items(company_id, id) on delete set null
);

create index if not exists idx_inspection_checklist_items_company_id on public.inspection_checklist_items(company_id);
create index if not exists idx_inspection_checklist_items_inspection on public.inspection_checklist_items(company_id, inspection_id);

create trigger trg_inspection_checklist_items_set_updated_at
before update on public.inspection_checklist_items
for each row execute function public.set_updated_at();

-- Quotes (from lead/inspection)
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lead_id uuid,
  inspection_id uuid,
  amount_cents bigint,
  currency text not null default 'EUR',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotes_company_id_id_uniq unique (company_id, id),
  constraint quotes_lead_fk foreign key (company_id, lead_id)
    references public.leads(company_id, id) on delete set null,
  constraint quotes_inspection_fk foreign key (company_id, inspection_id)
    references public.inspections(company_id, id) on delete set null
);

create index if not exists idx_quotes_company_id on public.quotes(company_id);
create index if not exists idx_quotes_lead_id on public.quotes(company_id, lead_id);
create index if not exists idx_quotes_inspection_id on public.quotes(company_id, inspection_id);

create trigger trg_quotes_set_updated_at
before update on public.quotes
for each row execute function public.set_updated_at();

-- Tickets (work orders / issues)
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid,
  site_id uuid,
  lead_id uuid,
  inspection_id uuid,
  title text not null,
  description text,
  status public.ticket_status not null default 'open',
  priority int not null default 0,
  assigned_to uuid,
  created_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tickets_company_id_id_uniq unique (company_id, id),
  constraint tickets_customer_fk foreign key (company_id, customer_id)
    references public.customers(company_id, id) on delete set null,
  constraint tickets_site_fk foreign key (company_id, site_id)
    references public.sites(company_id, id) on delete set null,
  constraint tickets_lead_fk foreign key (company_id, lead_id)
    references public.leads(company_id, id) on delete set null,
  constraint tickets_inspection_fk foreign key (company_id, inspection_id)
    references public.inspections(company_id, id) on delete set null,
  constraint tickets_assigned_to_fk foreign key (company_id, assigned_to)
    references public.app_users(company_id, id) on delete set null,
  constraint tickets_created_by_fk foreign key (company_id, created_by)
    references public.app_users(company_id, id) on delete set null
);

create index if not exists idx_tickets_company_id on public.tickets(company_id);
create index if not exists idx_tickets_status on public.tickets(company_id, status);
create index if not exists idx_tickets_assigned_to on public.tickets(assigned_to);
create index if not exists idx_tickets_site_id on public.tickets(company_id, site_id);
create index if not exists idx_tickets_customer_id on public.tickets(company_id, customer_id);

create trigger trg_tickets_set_updated_at
before update on public.tickets
for each row execute function public.set_updated_at();

-- Message log (webhook inputs, workflow outputs, etc.)
create table if not exists public.message_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  source text,
  event_type text,
  related_lead_id uuid,
  related_ticket_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_log_company_id_id_uniq unique (company_id, id),
  constraint message_log_lead_fk foreign key (company_id, related_lead_id)
    references public.leads(company_id, id) on delete set null,
  constraint message_log_ticket_fk foreign key (company_id, related_ticket_id)
    references public.tickets(company_id, id) on delete set null
);

create index if not exists idx_message_log_company_id on public.message_log(company_id);
create index if not exists idx_message_log_event on public.message_log(company_id, event_type);

create trigger trg_message_log_set_updated_at
before update on public.message_log
for each row execute function public.set_updated_at();

-- =========================
-- Row Level Security (RLS)
-- =========================

-- companies
alter table public.companies enable row level security;
drop policy if exists companies_select_member on public.companies;
create policy companies_select_member
on public.companies
for select
to authenticated
using (public.is_member_of_company(id));

drop policy if exists companies_update_admin on public.companies;
create policy companies_update_admin
on public.companies
for update
to authenticated
using (public.is_admin_of_company(id))
with check (public.is_admin_of_company(id));

-- app_users
alter table public.app_users enable row level security;

drop policy if exists app_users_select_company on public.app_users;
create policy app_users_select_company
on public.app_users
for select
to authenticated
using (public.is_member_of_company(company_id));

drop policy if exists app_users_insert_admin on public.app_users;
create policy app_users_insert_admin
on public.app_users
for insert
to authenticated
with check (public.is_admin_of_company(company_id));

drop policy if exists app_users_update_self_or_admin on public.app_users;
create policy app_users_update_self_or_admin
on public.app_users
for update
to authenticated
using (id = auth.uid() or public.is_admin_of_company(company_id))
with check (id = auth.uid() or public.is_admin_of_company(company_id));

drop policy if exists app_users_delete_admin on public.app_users;
create policy app_users_delete_admin
on public.app_users
for delete
to authenticated
using (public.is_admin_of_company(company_id));

-- customers
alter table public.customers enable row level security;
drop policy if exists customers_tenant_all on public.customers;
create policy customers_tenant_all
on public.customers
for all
to authenticated
using (public.is_member_of_company(company_id))
with check (public.is_member_of_company(company_id));

-- sites
alter table public.sites enable row level security;
drop policy if exists sites_tenant_all on public.sites;
create policy sites_tenant_all
on public.sites
for all
to authenticated
using (public.is_member_of_company(company_id))
with check (public.is_member_of_company(company_id));

-- leads
alter table public.leads enable row level security;
drop policy if exists leads_tenant_all on public.leads;
create policy leads_tenant_all
on public.leads
for all
to authenticated
using (public.is_member_of_company(company_id))
with check (public.is_member_of_company(company_id));

-- inspections
alter table public.inspections enable row level security;
drop policy if exists inspections_tenant_all on public.inspections;
create policy inspections_tenant_all
on public.inspections
for all
to authenticated
using (public.is_member_of_company(company_id))
with check (public.is_member_of_company(company_id));

-- checklist templates
alter table public.checklist_templates enable row level security;
drop policy if exists checklist_templates_tenant_all on public.checklist_templates;
create policy checklist_templates_tenant_all
on public.checklist_templates
for all
to authenticated
using (public.is_member_of_company(company_id))
with check (public.is_member_of_company(company_id));

alter table public.checklist_template_items enable row level security;
drop policy if exists checklist_template_items_tenant_all on public.checklist_template_items;
create policy checklist_template_items_tenant_all
on public.checklist_template_items
for all
to authenticated
using (public.is_member_of_company(company_id))
with check (public.is_member_of_company(company_id));

alter table public.inspection_checklist_items enable row level security;
drop policy if exists inspection_checklist_items_tenant_all on public.inspection_checklist_items;
create policy inspection_checklist_items_tenant_all
on public.inspection_checklist_items
for all
to authenticated
using (public.is_member_of_company(company_id))
with check (public.is_member_of_company(company_id));

-- quotes
alter table public.quotes enable row level security;
drop policy if exists quotes_tenant_all on public.quotes;
create policy quotes_tenant_all
on public.quotes
for all
to authenticated
using (public.is_member_of_company(company_id))
with check (public.is_member_of_company(company_id));

-- tickets
alter table public.tickets enable row level security;
drop policy if exists tickets_tenant_all on public.tickets;
create policy tickets_tenant_all
on public.tickets
for all
to authenticated
using (public.is_member_of_company(company_id))
with check (public.is_member_of_company(company_id));

-- message_log
alter table public.message_log enable row level security;
drop policy if exists message_log_tenant_all on public.message_log;
create policy message_log_tenant_all
on public.message_log
for all
to authenticated
using (public.is_member_of_company(company_id))
with check (public.is_member_of_company(company_id));

