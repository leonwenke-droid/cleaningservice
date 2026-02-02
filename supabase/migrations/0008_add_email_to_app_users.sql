-- 0008_add_email_to_app_users.sql
-- Add email column to app_users table for easier access

alter table public.app_users
add column if not exists email text;

-- Populate email from auth.users for existing rows
update public.app_users au
set email = (
  select email
  from auth.users
  where id = au.id
)
where email is null;

-- Create index for email lookups
create index if not exists idx_app_users_email on public.app_users(email);

-- Add comment
comment on column public.app_users.email is 'Email address (denormalized from auth.users for convenience)';
