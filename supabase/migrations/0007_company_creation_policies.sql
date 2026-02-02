-- 0007_company_creation_policies.sql
-- Allow authenticated users to create companies and their own app_users row during onboarding

-- =========================
-- Companies: Allow INSERT for authenticated users (onboarding)
-- =========================
drop policy if exists companies_insert_onboarding on public.companies;
create policy companies_insert_onboarding
on public.companies
for insert
to authenticated
with check (true); -- Any authenticated user can create a company

-- =========================
-- App_users: Allow INSERT for users creating their own profile (onboarding)
-- =========================
drop policy if exists app_users_insert_onboarding on public.app_users;
create policy app_users_insert_onboarding
on public.app_users
for insert
to authenticated
with check (
  -- User can only create their own app_users row (id = auth.uid())
  id = auth.uid()
  -- And they must set themselves as admin (first user = company admin)
  and role = 'admin'
);
