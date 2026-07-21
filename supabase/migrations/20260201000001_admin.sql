-- Admin panel: admins table, host activation flag, is_admin() helper, RLS

-- Soft-deactivation flag for hosts. Deactivated hosts are blocked from signing in.
alter table public.hosts
  add column if not exists is_active boolean not null default true,
  add column if not exists deactivated_at timestamptz;

-- Platform admins. Separate from host identity; an admin may or may not also be a host.
create table if not exists public.admins (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

-- True when the current auth user is a platform admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where auth_user_id = auth.uid());
$$;

alter table public.admins enable row level security;

-- Admins can read the admin list; writes go through the service role (server actions).
create policy admins_select on public.admins for select
  using (public.is_admin());

-- Admins can read every host regardless of ownership (in addition to the host's own-row policy).
create policy hosts_admin_select on public.hosts for select
  using (public.is_admin());
