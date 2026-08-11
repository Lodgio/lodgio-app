alter table public.bookings
  add column if not exists check_in_time text,
  add column if not exists check_out_time text;
