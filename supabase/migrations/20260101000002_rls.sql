-- RLS policies

create or replace function public.current_host_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.hosts where auth_user_id = auth.uid() limit 1;
$$;

alter table public.hosts enable row level security;
alter table public.host_settings enable row level security;
alter table public.gmail_connections enable row level security;
alter table public.properties enable row level security;
alter table public.caretakers enable row level security;
alter table public.property_caretakers enable row level security;
alter table public.guests enable row level security;
alter table public.bookings enable row level security;
alter table public.form_submissions enable row level security;
alter table public.message_templates enable row level security;
alter table public.message_log enable row level security;

-- hosts
create policy hosts_select on public.hosts for select
  using (auth_user_id = auth.uid());
create policy hosts_update on public.hosts for update
  using (auth_user_id = auth.uid());

-- host_settings
create policy host_settings_select on public.host_settings for select
  using (host_id = public.current_host_id());
create policy host_settings_update on public.host_settings for update
  using (host_id = public.current_host_id());

-- gmail_connections
create policy gmail_connections_all on public.gmail_connections for all
  using (host_id = public.current_host_id())
  with check (host_id = public.current_host_id());

-- properties
create policy properties_all on public.properties for all
  using (host_id = public.current_host_id())
  with check (host_id = public.current_host_id());

-- caretakers
create policy caretakers_all on public.caretakers for all
  using (host_id = public.current_host_id())
  with check (host_id = public.current_host_id());

-- property_caretakers (via property ownership)
create policy property_caretakers_all on public.property_caretakers for all
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.host_id = public.current_host_id()
    )
  )
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.host_id = public.current_host_id()
    )
  );

-- guests
create policy guests_all on public.guests for all
  using (host_id = public.current_host_id())
  with check (host_id = public.current_host_id());

-- bookings
create policy bookings_all on public.bookings for all
  using (host_id = public.current_host_id())
  with check (host_id = public.current_host_id());

-- form_submissions
create policy form_submissions_all on public.form_submissions for all
  using (host_id = public.current_host_id())
  with check (host_id = public.current_host_id());

-- message_templates
create policy message_templates_all on public.message_templates for all
  using (host_id = public.current_host_id())
  with check (host_id = public.current_host_id());

-- message_log
create policy message_log_all on public.message_log for all
  using (host_id = public.current_host_id())
  with check (host_id = public.current_host_id());
