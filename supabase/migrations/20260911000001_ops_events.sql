-- Operational events for launch monitoring (WhatsApp / Gmail / ingest).

create table if not exists public.ops_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  severity text not null check (severity in ('info', 'warning', 'critical')),
  kind text not null,
  host_id uuid references public.hosts (id) on delete set null,
  booking_id uuid references public.bookings (id) on delete set null,
  dedupe_key text,
  title text not null,
  detail text,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists ops_events_created_at_idx on public.ops_events (created_at desc);
create index if not exists ops_events_kind_host_idx on public.ops_events (kind, host_id, created_at desc);
create index if not exists ops_events_dedupe_idx on public.ops_events (kind, dedupe_key, created_at desc);

alter table public.ops_events enable row level security;

create policy ops_events_admin_select on public.ops_events for select
  using (public.is_admin());
