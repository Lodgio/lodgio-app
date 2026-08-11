-- Auth trigger: create host + settings on signup

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_slug text;
  final_slug text;
  suffix integer := 0;
begin
  base_slug := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'business_name', split_part(new.email, '@', 1)),
    '[^a-z0-9]+', '-', 'g'
  ));
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then
    base_slug := 'host';
  end if;

  final_slug := base_slug;
  while exists (select 1 from public.hosts where slug = final_slug) loop
    suffix := suffix + 1;
    final_slug := base_slug || '-' || suffix::text;
  end loop;

  insert into public.hosts (auth_user_id, business_name, slug, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'business_name', ''),
    final_slug,
    coalesce(new.raw_user_meta_data->>'phone', '')
  );

  insert into public.host_settings (host_id)
  select id from public.hosts where auth_user_id = new.id;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
