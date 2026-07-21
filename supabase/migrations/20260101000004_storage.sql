-- Storage bucket for guest ID documents

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'guest-documents',
  'guest-documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- Hosts can read their own documents via signed URLs (generated server-side with service role).
-- Direct client upload goes through server action using service role.
