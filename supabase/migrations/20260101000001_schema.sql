-- Lodgio schema: enums, tables, indexes

create extension if not exists "pgcrypto";

create type gmail_connection_status as enum ('active', 'needs_reconnect', 'revoked');
create type booking_status as enum (
  'ingested',
  'awaiting_guest_form',
  'matched',
  'messaging',
  'completed',
  'failed',
  'cancelled'
);
create type id_document_type as enum ('aadhaar', 'passport', 'other');
create type message_template_kind as enum ('guest_welcome', 'caretaker_notify', 'host_paste_fallback');
create type message_language as enum ('en', 'hi');
create type message_channel as enum ('whatsapp', 'sms');
create type message_recipient_type as enum ('guest', 'caretaker', 'host');
create type message_delivery_status as enum (
  'queued',
  'sent',
  'delivered',
  'failed',
  'fallback_triggered'
);

create table public.hosts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  business_name text not null default '',
  slug text not null unique,
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.host_settings (
  host_id uuid primary key references public.hosts (id) on delete cascade,
  sms_fallback_enabled boolean not null default false,
  sheets_export_enabled boolean not null default true,
  sheets_spreadsheet_id text,
  default_language message_language not null default 'en',
  whatsapp_phone_number_id text,
  whatsapp_waba_id text,
  onboarding_step integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gmail_connections (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts (id) on delete cascade,
  email_address text not null,
  refresh_token text not null,
  status gmail_connection_status not null default 'active',
  last_synced_at timestamptz,
  sync_cursor text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (host_id, email_address)
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts (id) on delete cascade,
  name text not null,
  address text not null default '',
  location_url text not null default '',
  house_rules text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.caretakers (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts (id) on delete cascade,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.property_caretakers (
  property_id uuid not null references public.properties (id) on delete cascade,
  caretaker_id uuid not null references public.caretakers (id) on delete cascade,
  primary key (property_id, caretaker_id)
);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts (id) on delete cascade,
  relay_email text not null,
  name text,
  whatsapp_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (host_id, relay_email)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  guest_id uuid references public.guests (id) on delete set null,
  airbnb_booking_id text not null,
  check_in date not null,
  check_out date not null,
  nights integer not null,
  guest_count integer not null default 1,
  amount_paid_by_guest numeric,
  amount_payable_to_host numeric,
  amount_payable_to_airbnb numeric,
  guest_notes text,
  raw_email_ref text,
  status booking_status not null default 'ingested',
  sheets_exported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (host_id, airbnb_booking_id)
);

create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  claimed_airbnb_booking_id text not null,
  name text not null,
  whatsapp_number text not null,
  id_document_path text not null,
  id_document_type id_document_type not null,
  check_in date,
  check_out date,
  guest_count integer,
  matched boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts (id) on delete cascade,
  kind message_template_kind not null,
  language message_language not null,
  meta_template_name text not null,
  body_preview text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (host_id, kind, language)
);

create table public.message_log (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts (id) on delete cascade,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  channel message_channel not null,
  recipient_type message_recipient_type not null,
  to_number text not null,
  template_kind text,
  wamid text,
  status message_delivery_status not null default 'queued',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bookings_host_status on public.bookings (host_id, status);
create index idx_form_submissions_unmatched on public.form_submissions (host_id, matched) where matched = false;
create index idx_message_log_booking on public.message_log (booking_id, recipient_type, template_kind);
create index idx_gmail_connections_active on public.gmail_connections (status) where status = 'active';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger hosts_updated_at before update on public.hosts
  for each row execute function public.set_updated_at();
create trigger host_settings_updated_at before update on public.host_settings
  for each row execute function public.set_updated_at();
create trigger gmail_connections_updated_at before update on public.gmail_connections
  for each row execute function public.set_updated_at();
create trigger properties_updated_at before update on public.properties
  for each row execute function public.set_updated_at();
create trigger caretakers_updated_at before update on public.caretakers
  for each row execute function public.set_updated_at();
create trigger guests_updated_at before update on public.guests
  for each row execute function public.set_updated_at();
create trigger bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();
create trigger message_templates_updated_at before update on public.message_templates
  for each row execute function public.set_updated_at();
create trigger message_log_updated_at before update on public.message_log
  for each row execute function public.set_updated_at();
