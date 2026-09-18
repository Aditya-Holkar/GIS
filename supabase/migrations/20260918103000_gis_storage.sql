insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gis-datasets', 'gis-datasets', false, 524288000,
  array[
    'application/geo+json','application/json','text/csv','application/zip',
    'application/x-zip-compressed','application/vnd.google-earth.kml+xml',
    'application/octet-stream','image/tiff','image/geotiff'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table storage.objects enable row level security;

create policy "authenticated GIS uploads"
on storage.objects for insert to authenticated
with check (bucket_id = 'gis-datasets');

create policy "authenticated GIS reads"
on storage.objects for select to authenticated
using (bucket_id = 'gis-datasets');

create policy "authenticated GIS updates"
on storage.objects for update to authenticated
using (bucket_id = 'gis-datasets')
with check (bucket_id = 'gis-datasets');

create policy "authenticated GIS deletes"
on storage.objects for delete to authenticated
using (bucket_id = 'gis-datasets');
