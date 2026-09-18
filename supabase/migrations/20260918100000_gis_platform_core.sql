-- GIS Studio core spatial model
-- Requires Supabase Auth + PostGIS. PostGIS is kept out of public.

create extension if not exists postgis with schema extensions;

create schema if not exists gis;

create type gis.member_role as enum ('owner','admin','editor','analyst','viewer');
create type gis.dataset_type as enum ('vector','raster','terrain','tiles','service');
create type gis.job_status as enum ('queued','running','succeeded','failed','cancelled');

create table if not exists gis.workspaces (
  id uuid primary key default extensions.uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gis.workspace_members (
  workspace_id uuid not null references gis.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role gis.member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists gis.datasets (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references gis.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  dataset_type gis.dataset_type not null default 'vector',
  format text,
  source_uri text,
  source_provider text,
  source_metadata jsonb not null default '{}'::jsonb,
  crs_epsg integer not null default 4326,
  bounds extensions.geometry(Polygon, 4326),
  feature_count bigint not null default 0,
  size_bytes bigint,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

create index if not exists datasets_workspace_idx on gis.datasets(workspace_id);
create index if not exists datasets_owner_idx on gis.datasets(owner_id);
create index if not exists datasets_bounds_gix on gis.datasets using gist(bounds);

create table if not exists gis.dataset_versions (
  id uuid primary key default extensions.uuid_generate_v4(),
  dataset_id uuid not null references gis.datasets(id) on delete cascade,
  version_number integer not null,
  object_key text,
  checksum text,
  schema_json jsonb not null default '{}'::jsonb,
  import_metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(dataset_id, version_number)
);

create table if not exists gis.features (
  id uuid primary key default extensions.uuid_generate_v4(),
  dataset_id uuid not null references gis.datasets(id) on delete cascade,
  version_id uuid references gis.dataset_versions(id) on delete set null,
  external_id text,
  properties jsonb not null default '{}'::jsonb,
  geom extensions.geometry(Geometry, 4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists features_dataset_idx on gis.features(dataset_id);
create index if not exists features_version_idx on gis.features(version_id);
create index if not exists features_external_id_idx on gis.features(dataset_id, external_id);
create index if not exists features_geom_gix on gis.features using gist(geom);
create index if not exists features_properties_gin on gis.features using gin(properties);

create table if not exists gis.saved_maps (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references gis.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  map_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gis.jobs (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid references gis.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  operation text not null,
  status gis.job_status not null default 'queued',
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  progress smallint not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists jobs_owner_status_idx on gis.jobs(owner_id, status);
create index if not exists jobs_workspace_status_idx on gis.jobs(workspace_id, status);

create table if not exists gis.audit_logs (
  id bigint generated always as identity primary key,
  workspace_id uuid references gis.workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_workspace_created_idx on gis.audit_logs(workspace_id, created_at desc);
create index if not exists audit_actor_created_idx on gis.audit_logs(actor_id, created_at desc);

-- Membership helper. Kept as a SQL function so policies can share one authorization rule.
create or replace function gis.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from gis.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
  )
  or exists (
    select 1 from gis.workspaces w
    where w.id = target_workspace
      and w.owner_id = (select auth.uid())
  );
$$;

create or replace function gis.workspace_role(target_workspace uuid)
returns gis.member_role
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select wm.role from gis.workspace_members wm
      where wm.workspace_id = target_workspace and wm.user_id = (select auth.uid())),
    case when exists (
      select 1 from gis.workspaces w
      where w.id = target_workspace and w.owner_id = (select auth.uid())
    ) then 'owner'::gis.member_role else null end
  );
$$;

-- GeoJSON-friendly query primitives used by the application.
create or replace function gis.features_in_view(
  p_dataset_id uuid,
  p_min_lon double precision,
  p_min_lat double precision,
  p_max_lon double precision,
  p_max_lat double precision,
  p_limit integer default 5000
)
returns table (
  id uuid,
  external_id text,
  properties jsonb,
  geojson jsonb
)
language sql
stable
set search_path = ''
as $$
  select
    f.id,
    f.external_id,
    f.properties,
    extensions.st_asgeojson(f.geom)::jsonb
  from gis.features f
  where f.dataset_id = p_dataset_id
    and f.geom && extensions.st_transform(
      extensions.st_makeenvelope(p_min_lon, p_min_lat, p_max_lon, p_max_lat, 4326),
      4326
    )
    and gis.is_workspace_member((select d.workspace_id from gis.datasets d where d.id = p_dataset_id))
  limit greatest(1, least(p_limit, 10000));
$$;

create or replace function gis.nearby_features(
  p_dataset_id uuid,
  p_lon double precision,
  p_lat double precision,
  p_radius_meters double precision default 10000,
  p_limit integer default 100
)
returns table (
  id uuid,
  external_id text,
  properties jsonb,
  distance_meters double precision,
  geojson jsonb
)
language sql
stable
set search_path = ''
as $$
  select
    f.id,
    f.external_id,
    f.properties,
    extensions.st_distance(
      f.geom::extensions.geography,
      extensions.st_setsrid(extensions.st_makepoint(p_lon, p_lat), 4326)::extensions.geography
    ) as distance_meters,
    extensions.st_asgeojson(f.geom)::jsonb
  from gis.features f
  join gis.datasets d on d.id = f.dataset_id
  where f.dataset_id = p_dataset_id
    and gis.is_workspace_member(d.workspace_id)
    and extensions.st_dwithin(
      f.geom::extensions.geography,
      extensions.st_setsrid(extensions.st_makepoint(p_lon, p_lat), 4326)::extensions.geography,
      greatest(0, p_radius_meters)
    )
  order by f.geom <-> extensions.st_setsrid(extensions.st_makepoint(p_lon, p_lat), 4326)
  limit greatest(1, least(p_limit, 1000));
$$;

create or replace function gis.feature_distance(
  p_dataset_id uuid,
  p_feature_a uuid,
  p_feature_b uuid
)
returns double precision
language sql
stable
set search_path = ''
as $$
  select extensions.st_distance(a.geom::extensions.geography, b.geom::extensions.geography)
  from gis.features a
  join gis.features b on b.id = p_feature_b
  where a.id = p_feature_a
    and a.dataset_id = p_dataset_id
    and b.dataset_id = p_dataset_id
    and gis.is_workspace_member((select workspace_id from gis.datasets where id = p_dataset_id));
$$;

-- RLS: every exposed table is protected. Policies are workspace/member based.
alter table gis.workspaces enable row level security;
alter table gis.workspace_members enable row level security;
alter table gis.datasets enable row level security;
alter table gis.dataset_versions enable row level security;
alter table gis.features enable row level security;
alter table gis.saved_maps enable row level security;
alter table gis.jobs enable row level security;
alter table gis.audit_logs enable row level security;

create policy "workspace members can read workspaces" on gis.workspaces
for select to authenticated using (gis.is_workspace_member(id));
create policy "users can create owned workspaces" on gis.workspaces
for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "workspace owners can update" on gis.workspaces
for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "workspace owners can delete" on gis.workspaces
for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "members can read memberships" on gis.workspace_members
for select to authenticated using (gis.is_workspace_member(workspace_id));
create policy "workspace owners/admins manage memberships" on gis.workspace_members
for all to authenticated
using (gis.workspace_role(workspace_id) in ('owner','admin'))
with check (gis.workspace_role(workspace_id) in ('owner','admin'));

create policy "members can read datasets" on gis.datasets
for select to authenticated using (gis.is_workspace_member(workspace_id) or is_public);
create policy "editors can create datasets" on gis.datasets
for insert to authenticated with check (
  (select auth.uid()) = owner_id and gis.workspace_role(workspace_id) in ('owner','admin','editor')
);
create policy "editors can update datasets" on gis.datasets
for update to authenticated using (gis.workspace_role(workspace_id) in ('owner','admin','editor'))
with check (gis.workspace_role(workspace_id) in ('owner','admin','editor'));
create policy "owners/admins delete datasets" on gis.datasets
for delete to authenticated using (gis.workspace_role(workspace_id) in ('owner','admin'));

create policy "members can read versions" on gis.dataset_versions
for select to authenticated using (
  exists (select 1 from gis.datasets d where d.id = dataset_id and gis.is_workspace_member(d.workspace_id))
);
create policy "editors can manage versions" on gis.dataset_versions
for all to authenticated
using (
  exists (select 1 from gis.datasets d where d.id = dataset_id and gis.workspace_role(d.workspace_id) in ('owner','admin','editor'))
)
with check (
  exists (select 1 from gis.datasets d where d.id = dataset_id and gis.workspace_role(d.workspace_id) in ('owner','admin','editor'))
);

create policy "members can read features" on gis.features
for select to authenticated using (
  exists (select 1 from gis.datasets d where d.id = dataset_id and gis.is_workspace_member(d.workspace_id))
);
create policy "editors can write features" on gis.features
for all to authenticated
using (
  exists (select 1 from gis.datasets d where d.id = dataset_id and gis.workspace_role(d.workspace_id) in ('owner','admin','editor'))
)
with check (
  exists (select 1 from gis.datasets d where d.id = dataset_id and gis.workspace_role(d.workspace_id) in ('owner','admin','editor'))
);

create policy "members can manage saved maps" on gis.saved_maps
for all to authenticated
using (gis.is_workspace_member(workspace_id))
with check ((select auth.uid()) = owner_id and gis.is_workspace_member(workspace_id));

create policy "users can read own jobs" on gis.jobs
for select to authenticated using ((select auth.uid()) = owner_id or gis.is_workspace_member(workspace_id));
create policy "users can create own jobs" on gis.jobs
for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "users can update own jobs" on gis.jobs
for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy "members can read audit logs" on gis.audit_logs
for select to authenticated using (gis.is_workspace_member(workspace_id));

grant usage on schema gis to authenticated;
grant select, insert, update, delete on all tables in schema gis to authenticated;
grant usage, select on sequence gis.audit_logs_id_seq to authenticated;


-- PostgREST exposes public by default. Thin invoker wrappers keep the GIS schema
-- private while allowing authenticated clients to call the spatial primitives.
create or replace function public.gis_features_in_view(
  p_dataset_id uuid, p_min_lon double precision, p_min_lat double precision,
  p_max_lon double precision, p_max_lat double precision, p_limit integer default 5000
)
returns table (id uuid, external_id text, properties jsonb, geojson jsonb)
language sql stable set search_path = ''
as $$ select * from gis.features_in_view(p_dataset_id, p_min_lon, p_min_lat, p_max_lon, p_max_lat, p_limit); $$;

create or replace function public.gis_nearby_features(
  p_dataset_id uuid, p_lon double precision, p_lat double precision,
  p_radius_meters double precision default 10000, p_limit integer default 100
)
returns table (id uuid, external_id text, properties jsonb, distance_meters double precision, geojson jsonb)
language sql stable set search_path = ''
as $$ select * from gis.nearby_features(p_dataset_id, p_lon, p_lat, p_radius_meters, p_limit); $$;

create or replace function public.gis_feature_distance(
  p_dataset_id uuid, p_feature_a uuid, p_feature_b uuid
)
returns double precision
language sql stable set search_path = ''
as $$ select gis.feature_distance(p_dataset_id, p_feature_a, p_feature_b); $$;

grant execute on function public.gis_features_in_view(uuid,double precision,double precision,double precision,double precision,integer) to authenticated;
grant execute on function public.gis_nearby_features(uuid,double precision,double precision,double precision,integer) to authenticated;
grant execute on function public.gis_feature_distance(uuid,uuid,uuid) to authenticated;
