-- Post-registration welcome flow: host WhatsApp verification + check-in link confirmation.
-- Welcome is complete when both whatsapp_verified_at and checkin_link_confirmed_at are set.

alter table public.host_settings
  add column if not exists whatsapp_test_sent_at timestamptz,
  add column if not exists whatsapp_verified_at timestamptz,
  add column if not exists checkin_link_confirmed_at timestamptz;
