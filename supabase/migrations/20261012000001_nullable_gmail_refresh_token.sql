-- Revoke must be able to delete the stored OAuth token while keeping the row,
-- so the UI can still show that the connection was disconnected.
alter table public.gmail_connections
  alter column refresh_token drop not null;
