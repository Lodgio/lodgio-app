-- Guest IDs upload directly from the phone. 10 MB was below many camera photos and PDFs.
update storage.buckets
set
  file_size_limit = 26214400,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf'
  ]
where id = 'guest-documents';
