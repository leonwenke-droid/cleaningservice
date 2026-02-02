-- ============================================
-- Standardized Inspection Checklist System
-- ============================================
-- This migration creates a versioned, scalable checklist system
-- that supports structured data collection, validation, and reporting.

-- ============================================
-- 1. CHECKLIST TEMPLATE VERSIONS
-- ============================================
-- Versioning allows checklist evolution without breaking old inspections

create table if not exists public.checklist_template_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_id uuid not null,
  version_number int not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint checklist_template_versions_company_id_id_uniq unique (company_id, id),
  constraint checklist_template_versions_template_version_uniq unique (company_id, template_id, version_number),
  constraint checklist_template_versions_template_fk foreign key (company_id, template_id)
    references public.checklist_templates(company_id, id) on delete cascade,
  constraint checklist_template_versions_created_by_fk foreign key (company_id, created_by)
    references public.app_users(company_id, id) on delete set null
);

create index if not exists idx_checklist_template_versions_company_id on public.checklist_template_versions(company_id);
create index if not exists idx_checklist_template_versions_template on public.checklist_template_versions(company_id, template_id, version_number);
create index if not exists idx_checklist_template_versions_active on public.checklist_template_versions(company_id, is_active) where is_active = true;

-- ============================================
-- 2. CHECKLIST ITEMS (versioned)
-- ============================================
-- Items belong to a specific template version
-- Support multiple data types and validation rules

create type public.checklist_item_type as enum (
  'rating',           -- 1-5 scale
  'boolean',          -- yes/no
  'enum',             -- predefined options
  'integer',          -- whole number
  'text',             -- short text (max 255)
  'textarea',         -- longer text
  'timestamp',        -- date/time
  'multi_select'      -- multiple enum values
);

create type public.checklist_item_section as enum (
  'meta',             -- Section 0: Meta/Header
  'core_quality',     -- Section 1: Core Quality Scores
  'modules',          -- Section 2: Optional Modules
  'extras',           -- Section 3: Extras/Deviations
  'finalization'      -- Section 4: Finalization
);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_version_id uuid not null,
  section public.checklist_item_section not null,
  sort_order int not null default 0,
  item_key text not null, -- unique identifier within template version (e.g., 'floors_score')
  label text not null,
  help_text text,
  item_type public.checklist_item_type not null,
  required boolean not null default false,
  -- Validation rules (JSONB for flexibility)
  validation_rules jsonb default '{}'::jsonb,
  -- Conditional logic (JSONB)
  -- Example: {"required_if": {"field": "floors_score", "operator": "<=", "value": 2}}
  conditional_logic jsonb default '{}'::jsonb,
  -- Enum options (for enum/multi_select types)
  enum_options jsonb, -- Array of {value: string, label: string}
  -- Default value
  default_value jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checklist_items_company_id_id_uniq unique (company_id, id),
  constraint checklist_items_template_key_uniq unique (company_id, template_version_id, item_key),
  constraint checklist_items_template_version_fk foreign key (company_id, template_version_id)
    references public.checklist_template_versions(company_id, id) on delete cascade
);

create index if not exists idx_checklist_items_company_id on public.checklist_items(company_id);
create index if not exists idx_checklist_items_template_version on public.checklist_items(company_id, template_version_id, section, sort_order);

create trigger trg_checklist_items_set_updated_at
before update on public.checklist_items
for each row execute function public.set_updated_at();

-- ============================================
-- 3. INSPECTION RESPONSES
-- ============================================
-- Stores responses to checklist items for each inspection

create table if not exists public.inspection_responses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  inspection_id uuid not null,
  checklist_item_id uuid not null,
  -- Response value (JSONB to support different types)
  value jsonb not null,
  -- Optional note/comment
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspection_responses_company_id_id_uniq unique (company_id, id),
  constraint inspection_responses_inspection_item_uniq unique (company_id, inspection_id, checklist_item_id),
  constraint inspection_responses_inspection_fk foreign key (company_id, inspection_id)
    references public.inspections(company_id, id) on delete cascade,
  constraint inspection_responses_item_fk foreign key (company_id, checklist_item_id)
    references public.checklist_items(company_id, id) on delete restrict
);

create index if not exists idx_inspection_responses_company_id on public.inspection_responses(company_id);
create index if not exists idx_inspection_responses_inspection on public.inspection_responses(company_id, inspection_id);
create index if not exists idx_inspection_responses_item on public.inspection_responses(company_id, checklist_item_id);

create trigger trg_inspection_responses_set_updated_at
before update on public.inspection_responses
for each row execute function public.set_updated_at();

-- ============================================
-- 4. INSPECTION FILES
-- ============================================
-- Stores photos/files attached to inspections or specific checklist items

create table if not exists public.inspection_files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  inspection_id uuid not null,
  checklist_item_id uuid,
  storage_path text not null,
  file_name text,
  file_size bigint,
  mime_type text,
  uploaded_by uuid,
  created_at timestamptz not null default now(),
  constraint inspection_files_company_id_id_uniq unique (company_id, id),
  constraint inspection_files_inspection_fk foreign key (company_id, inspection_id)
    references public.inspections(company_id, id) on delete cascade,
  constraint inspection_files_item_fk foreign key (company_id, checklist_item_id)
    references public.checklist_items(company_id, id) on delete set null,
  constraint inspection_files_uploaded_by_fk foreign key (company_id, uploaded_by)
    references public.app_users(company_id, id) on delete set null
);

create index if not exists idx_inspection_files_company_id on public.inspection_files(company_id);
create index if not exists idx_inspection_files_inspection on public.inspection_files(company_id, inspection_id);
create index if not exists idx_inspection_files_item on public.inspection_files(company_id, checklist_item_id) where checklist_item_id is not null;

-- ============================================
-- 5. UPDATE INSPECTIONS TABLE
-- ============================================
-- Add reference to checklist template version

alter table public.inspections
add column if not exists checklist_template_version_id uuid;

-- Add foreign key constraint for checklist_template_version_id
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'inspections_template_version_fk'
  ) then
    alter table public.inspections
    add constraint inspections_template_version_fk 
    foreign key (company_id, checklist_template_version_id)
    references public.checklist_template_versions(company_id, id) on delete restrict;
  end if;
end $$;

create index if not exists idx_inspections_template_version on public.inspections(company_id, checklist_template_version_id);

-- Add site snapshot fields (snapshot at inspection creation time)
alter table public.inspections
add column if not exists site_name_snapshot text,
add column if not exists site_address_snapshot text,
add column if not exists site_type_snapshot text,
add column if not exists service_type_snapshot text;

-- ============================================
-- 6. ROW LEVEL SECURITY
-- ============================================

alter table public.checklist_template_versions enable row level security;
alter table public.checklist_items enable row level security;
alter table public.inspection_responses enable row level security;
alter table public.inspection_files enable row level security;

-- Checklist template versions: company members can read, admins can write
drop policy if exists checklist_template_versions_select_member on public.checklist_template_versions;
create policy checklist_template_versions_select_member
on public.checklist_template_versions
for select
to authenticated
using (public.is_member_of_company(company_id));

drop policy if exists checklist_template_versions_insert_admin on public.checklist_template_versions;
create policy checklist_template_versions_insert_admin
on public.checklist_template_versions
for insert
to authenticated
with check (public.is_admin_of_company(company_id));

drop policy if exists checklist_template_versions_update_admin on public.checklist_template_versions;
create policy checklist_template_versions_update_admin
on public.checklist_template_versions
for update
to authenticated
using (public.is_admin_of_company(company_id))
with check (public.is_admin_of_company(company_id));

-- Checklist items: company members can read, admins can write
drop policy if exists checklist_items_select_member on public.checklist_items;
create policy checklist_items_select_member
on public.checklist_items
for select
to authenticated
using (public.is_member_of_company(company_id));

drop policy if exists checklist_items_insert_admin on public.checklist_items;
create policy checklist_items_insert_admin
on public.checklist_items
for insert
to authenticated
with check (public.is_admin_of_company(company_id));

drop policy if exists checklist_items_update_admin on public.checklist_items;
create policy checklist_items_update_admin
on public.checklist_items
for update
to authenticated
using (public.is_admin_of_company(company_id))
with check (public.is_admin_of_company(company_id));

-- Inspection responses: assigned worker can write, company members can read
drop policy if exists inspection_responses_select_member on public.inspection_responses;
create policy inspection_responses_select_member
on public.inspection_responses
for select
to authenticated
using (public.is_member_of_company(company_id));

drop policy if exists inspection_responses_insert_assigned on public.inspection_responses;
create policy inspection_responses_insert_assigned
on public.inspection_responses
for insert
to authenticated
with check (
  public.is_member_of_company(company_id) and
  (
    -- Assigned worker can insert before submission
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.company_id = company_id
        and i.assigned_to = auth.uid()
        and i.status in ('open', 'in_progress')
    ) or
    -- Admin/dispatcher can always insert
    public.is_admin_of_company(company_id) or
    exists (
      select 1 from public.app_users au
      where au.id = auth.uid()
        and au.company_id = company_id
        and au.role in ('admin', 'dispatcher')
    )
  )
);

drop policy if exists inspection_responses_update_assigned on public.inspection_responses;
create policy inspection_responses_update_assigned
on public.inspection_responses
for update
to authenticated
using (
  public.is_member_of_company(company_id) and
  (
    -- Assigned worker can update before submission
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.company_id = company_id
        and i.assigned_to = auth.uid()
        and i.status in ('open', 'in_progress')
    ) or
    -- Admin/dispatcher can always update
    public.is_admin_of_company(company_id) or
    exists (
      select 1 from public.app_users au
      where au.id = auth.uid()
        and au.company_id = company_id
        and au.role in ('admin', 'dispatcher')
    )
  )
)
with check (
  public.is_member_of_company(company_id) and
  (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.company_id = company_id
        and i.assigned_to = auth.uid()
        and i.status in ('open', 'in_progress')
    ) or
    public.is_admin_of_company(company_id) or
    exists (
      select 1 from public.app_users au
      where au.id = auth.uid()
        and au.company_id = company_id
        and au.role in ('admin', 'dispatcher')
    )
  )
);

-- Inspection files: same rules as responses
drop policy if exists inspection_files_select_member on public.inspection_files;
create policy inspection_files_select_member
on public.inspection_files
for select
to authenticated
using (public.is_member_of_company(company_id));

drop policy if exists inspection_files_insert_assigned on public.inspection_files;
create policy inspection_files_insert_assigned
on public.inspection_files
for insert
to authenticated
with check (
  public.is_member_of_company(company_id) and
  (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.company_id = company_id
        and i.assigned_to = auth.uid()
        and i.status in ('open', 'in_progress')
    ) or
    public.is_admin_of_company(company_id) or
    exists (
      select 1 from public.app_users au
      where au.id = auth.uid()
        and au.company_id = company_id
        and au.role in ('admin', 'dispatcher')
    )
  )
);

drop policy if exists inspection_files_delete_assigned on public.inspection_files;
create policy inspection_files_delete_assigned
on public.inspection_files
for delete
to authenticated
using (
  public.is_member_of_company(company_id) and
  (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.company_id = company_id
        and i.assigned_to = auth.uid()
        and i.status in ('open', 'in_progress')
    ) or
    public.is_admin_of_company(company_id) or
    exists (
      select 1 from public.app_users au
      where au.id = auth.uid()
        and au.company_id = company_id
        and au.role in ('admin', 'dispatcher')
    )
  )
);

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Function to get active checklist template version for a company
create or replace function public.get_active_checklist_template_version(p_company_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.checklist_template_versions
  where company_id = p_company_id
    and is_active = true
  order by created_at desc
  limit 1;
$$;

-- Function to validate inspection responses before submission
create or replace function public.validate_inspection_responses(p_inspection_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inspection record;
  v_template_version_id uuid;
  v_required_items record;
  v_missing_items text[];
  v_validation_errors jsonb := '[]'::jsonb;
  v_item record;
  v_response_value jsonb;
  v_score_value int;
begin
  -- Get inspection and template version
  select i.id, i.company_id, i.status, i.checklist_template_version_id
  into v_inspection
  from public.inspections i
  where i.id = p_inspection_id;
  
  if not found then
    return jsonb_build_object('valid', false, 'error', 'Inspection not found');
  end if;
  
  v_template_version_id := v_inspection.checklist_template_version_id;
  
  if v_template_version_id is null then
    return jsonb_build_object('valid', false, 'error', 'No checklist template assigned');
  end if;
  
  -- Check required items
  for v_item in
    select ci.*
    from public.checklist_items ci
    where ci.company_id = v_inspection.company_id
      and ci.template_version_id = v_template_version_id
      and ci.required = true
  loop
    -- Check if response exists
    select ir.value into v_response_value
    from public.inspection_responses ir
    where ir.inspection_id = p_inspection_id
      and ir.checklist_item_id = v_item.id;
    
    if not found or v_response_value is null then
      v_missing_items := array_append(v_missing_items, v_item.item_key);
    end if;
    
    -- Check conditional requirements (e.g., deviation_reason required if score <= 2)
    if v_item.conditional_logic is not null and v_item.conditional_logic != '{}'::jsonb then
      -- This would need more complex logic based on conditional_logic structure
      -- For now, we'll handle this in the application layer
    end if;
  end loop;
  
  if array_length(v_missing_items, 1) > 0 then
    return jsonb_build_object(
      'valid', false,
      'error', 'Missing required fields',
      'missing_items', to_jsonb(v_missing_items)
    );
  end if;
  
  -- Check deviation rules (score <= 2 requires deviation_reason and photo)
  for v_item in
    select ci.*, ir.value as response_value
    from public.checklist_items ci
    left join public.inspection_responses ir on ir.checklist_item_id = ci.id and ir.inspection_id = p_inspection_id
    where ci.company_id = v_inspection.company_id
      and ci.template_version_id = v_template_version_id
      and ci.item_type = 'rating'
      and ci.item_key like '%_score'
  loop
    if v_item.response_value is not null then
      v_score_value := (v_item.response_value->>0)::int;
      
      if v_score_value <= 2 then
        -- Check if deviation_reason exists
        declare
          v_deviation_reason jsonb;
          v_has_photo boolean;
        begin
          select ir.value into v_deviation_reason
          from public.checklist_items ci2
          left join public.inspection_responses ir on ir.checklist_item_id = ci2.id and ir.inspection_id = p_inspection_id
          where ci2.company_id = v_inspection.company_id
            and ci2.template_version_id = v_template_version_id
            and ci2.item_key = 'deviation_reason';
          
          select exists(
            select 1 from public.inspection_files if
            where if.inspection_id = p_inspection_id
              and (if.checklist_item_id = v_item.id or if.checklist_item_id is null)
          ) into v_has_photo;
          
          if v_deviation_reason is null or (v_deviation_reason->>0)::text is null then
            v_validation_errors := v_validation_errors || jsonb_build_object(
              'item_key', v_item.item_key,
              'error', 'Deviation reason required for score <= 2'
            );
          end if;
          
          if not v_has_photo then
            v_validation_errors := v_validation_errors || jsonb_build_object(
              'item_key', v_item.item_key,
              'error', 'Photo required for score <= 2'
            );
          end if;
        end;
      end if;
    end if;
  end loop;
  
  if jsonb_array_length(v_validation_errors) > 0 then
    return jsonb_build_object(
      'valid', false,
      'error', 'Validation errors',
      'errors', v_validation_errors
    );
  end if;
  
  return jsonb_build_object('valid', true);
end;
$$;
