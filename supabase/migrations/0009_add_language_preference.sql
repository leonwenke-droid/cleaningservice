-- Add language preference to app_users table
alter table public.app_users
add column if not exists preferred_language text default 'de' check (preferred_language in ('de', 'en', 'pl', 'ro', 'ru'));

create index if not exists idx_app_users_preferred_language on public.app_users(preferred_language);

comment on column public.app_users.preferred_language is 'User preferred language code (de, en, pl, ro, ru)';
