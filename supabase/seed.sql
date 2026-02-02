-- supabase/seed.sql
-- Demo seed data for local dev (Supabase)

do $$
declare
  v_company_id uuid := '11111111-1111-1111-1111-111111111111';
  v_admin_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_dispatcher_id uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_worker_id uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  v_customer_id uuid := '22222222-2222-2222-2222-222222222222';
  v_site_1_id uuid := '33333333-3333-3333-3333-333333333333';
  v_site_2_id uuid := '44444444-4444-4444-4444-444444444444';

  v_lead_1_id uuid := '55555555-5555-5555-5555-555555555555';
  v_lead_2_id uuid := '66666666-6666-6666-6666-666666666666';

  v_inspection_1_id uuid := '77777777-7777-7777-7777-777777777777';
  v_inspection_2_id uuid := '88888888-8888-8888-8888-888888888888';

  v_instance_id uuid;
begin
  -- Grab auth instance id (exists in local Supabase)
  select id into v_instance_id from auth.instances limit 1;
  if v_instance_id is null then
    raise exception 'No auth.instances row found. Is Supabase auth initialized?';
  end if;

  -- Cleanup (idempotent-ish)
  delete from public.companies where id = v_company_id;

  delete from auth.identities where user_id in (v_admin_id, v_dispatcher_id, v_worker_id);
  delete from auth.users where id in (v_admin_id, v_dispatcher_id, v_worker_id);

  -- Company
  insert into public.companies (id, name)
  values (v_company_id, 'Bock Gebäudereinigung (Demo)')
  on conflict (id) do update set name = excluded.name;

  -- Auth users (password for all: "password")
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values
    (
      v_instance_id,
      v_admin_id,
      'authenticated',
      'authenticated',
      'admin@demo.test',
      crypt('password', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Demo Admin"}'::jsonb,
      now(),
      now()
    ),
    (
      v_instance_id,
      v_dispatcher_id,
      'authenticated',
      'authenticated',
      'dispatcher@demo.test',
      crypt('password', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Demo Dispatcher"}'::jsonb,
      now(),
      now()
    ),
    (
      v_instance_id,
      v_worker_id,
      'authenticated',
      'authenticated',
      'worker@demo.test',
      crypt('password', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Demo Worker"}'::jsonb,
      now(),
      now()
    )
  on conflict (id) do nothing;

  -- Identities (required by GoTrue for email/password users)
  insert into auth.identities (
    user_id,
    provider,
    identity_data,
    created_at,
    updated_at
  ) values
    (
      v_admin_id,
      'email',
      jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@demo.test'),
      now(),
      now()
    ),
    (
      v_dispatcher_id,
      'email',
      jsonb_build_object('sub', v_dispatcher_id::text, 'email', 'dispatcher@demo.test'),
      now(),
      now()
    ),
    (
      v_worker_id,
      'email',
      jsonb_build_object('sub', v_worker_id::text, 'email', 'worker@demo.test'),
      now(),
      now()
    )
  on conflict do nothing;

  -- App user mappings (tenant + roles)
  insert into public.app_users (id, company_id, role, full_name, phone)
  values
    (v_admin_id, v_company_id, 'admin', 'Demo Admin', '+49 555 0001'),
    (v_dispatcher_id, v_company_id, 'dispatcher', 'Demo Dispatcher', '+49 555 0002'),
    (v_worker_id, v_company_id, 'worker', 'Demo Worker', '+49 555 0003')
  on conflict (id) do update set
    company_id = excluded.company_id,
    role = excluded.role,
    full_name = excluded.full_name,
    phone = excluded.phone,
    updated_at = now();

  -- Customer + sites
  insert into public.customers (id, company_id, name, email, phone, notes)
  values (v_customer_id, v_company_id, 'Hausverwaltung Muster GmbH', 'kontakt@muster.test', '+49 555 1000', 'Demo customer')
  on conflict (id) do update set
    company_id = excluded.company_id,
    name = excluded.name,
    email = excluded.email,
    phone = excluded.phone,
    notes = excluded.notes,
    updated_at = now();

  insert into public.sites (id, company_id, customer_id, name, address_line1, city, postal_code, country, notes)
  values
    (v_site_1_id, v_company_id, v_customer_id, 'Bürogebäude Zentrum', 'Hauptstraße 1', 'Berlin', '10115', 'DE', 'Key box at reception'),
    (v_site_2_id, v_company_id, v_customer_id, 'Lagerhalle West', 'Industrieweg 12', 'Berlin', '13627', 'DE', 'Forklift traffic after 18:00')
  on conflict (id) do update set
    company_id = excluded.company_id,
    customer_id = excluded.customer_id,
    name = excluded.name,
    address_line1 = excluded.address_line1,
    city = excluded.city,
    postal_code = excluded.postal_code,
    country = excluded.country,
    notes = excluded.notes,
    updated_at = now();

  -- Leads
  insert into public.leads (id, company_id, customer_id, site_id, source, title, description, status, created_by)
  values
    (
      v_lead_1_id,
      v_company_id,
      v_customer_id,
      v_site_1_id,
      'webhook:n8n',
      'Unterhaltsreinigung – Bürogebäude Zentrum',
      'Anfrage für tägliche Reinigung (Mo–Fr), inkl. Sanitärbereiche.',
      'inspection_scheduled',
      v_dispatcher_id
    ),
    (
      v_lead_2_id,
      v_company_id,
      v_customer_id,
      v_site_2_id,
      'manual',
      'Grundreinigung – Lagerhalle West',
      'Grundreinigung Boden + Markierungen. Zugang nur ab 18:00.',
      'qualified',
      v_admin_id
    )
  on conflict (id) do update set
    company_id = excluded.company_id,
    customer_id = excluded.customer_id,
    site_id = excluded.site_id,
    source = excluded.source,
    title = excluded.title,
    description = excluded.description,
    status = excluded.status,
    created_by = excluded.created_by,
    updated_at = now();

  -- Inspections
  insert into public.inspections (
    id,
    company_id,
    lead_id,
    site_id,
    scheduled_at,
    status,
    assigned_to,
    notes
  ) values
    (
      v_inspection_1_id,
      v_company_id,
      v_lead_1_id,
      v_site_1_id,
      now() + interval '2 days',
      'open',
      v_worker_id,
      'Bitte Fotos von Sanitär + Küche.'
    ),
    (
      v_inspection_2_id,
      v_company_id,
      v_lead_2_id,
      v_site_2_id,
      now() + interval '5 days',
      'open',
      v_worker_id,
      'Achtung: Staplerverkehr, PSA erforderlich.'
    )
  on conflict (id) do update set
    company_id = excluded.company_id,
    lead_id = excluded.lead_id,
    site_id = excluded.site_id,
    scheduled_at = excluded.scheduled_at,
    status = excluded.status,
    assigned_to = excluded.assigned_to,
    notes = excluded.notes,
    updated_at = now();
end $$;

