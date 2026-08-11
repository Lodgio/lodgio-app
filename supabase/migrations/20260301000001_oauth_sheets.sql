-- OAuth Sheets export: track granted Google scopes + Sheets connection status

alter table public.gmail_connections
  add column if not exists granted_scopes text not null default 'https://www.googleapis.com/auth/gmail.readonly';

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'sheets_connection_status'
  ) then
    create type public.sheets_connection_status as enum ('active', 'needs_reconnect', 'disabled');
  end if;
end $$;

alter table public.host_settings
  add column if not exists sheets_status public.sheets_connection_status not null default 'disabled';

-- Existing hosts with sheets_export_enabled stay enabled but need OAuth reconnect
-- (service-account path is removed). Mark them needs_reconnect if they had a spreadsheet id.
update public.host_settings
set sheets_status = 'needs_reconnect'
where sheets_export_enabled = true
  and sheets_spreadsheet_id is not null;

update public.host_settings
set sheets_export_enabled = false,
    sheets_status = 'disabled'
where sheets_export_enabled = true
  and sheets_spreadsheet_id is null;

alter table public.host_settings
  alter column sheets_export_enabled set default false;
