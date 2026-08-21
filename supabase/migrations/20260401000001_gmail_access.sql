-- Gmail allowlist review: host requests an inbox, admin approves after adding Test users.

create type public.gmail_access_status as enum (
  'none',
  'pending_review',
  'approved',
  'connected'
);

alter table public.host_settings
  add column if not exists gmail_requested_email text,
  add column if not exists gmail_access_status public.gmail_access_status not null default 'none',
  add column if not exists gmail_access_requested_at timestamptz,
  add column if not exists gmail_access_approved_at timestamptz;

update public.host_settings as settings
set
  gmail_access_status = 'connected',
  gmail_requested_email = coalesce(settings.gmail_requested_email, connection.email_address),
  gmail_access_approved_at = coalesce(settings.gmail_access_approved_at, connection.created_at)
from public.gmail_connections as connection
where
  connection.host_id = settings.host_id
  and connection.status = 'active';
