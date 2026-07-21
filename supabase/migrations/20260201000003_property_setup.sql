-- Store Airbnb listing name on bookings for property remapping.
alter table public.bookings
  add column if not exists listing_name text;

-- Default check-in time per property (e.g. "2:00 PM").
alter table public.properties
  add column if not exists check_in_time text not null default '2:00 PM';
