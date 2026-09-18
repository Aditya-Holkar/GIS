# GIS Studio database

The GIS core uses Supabase Postgres + PostGIS. The migration in `supabase/migrations/` creates workspaces, memberships, datasets, versions, spatial features, saved maps, jobs and audit logs.

## Spatial model

- All application geometries are normalized to EPSG:4326.
- Vector features use PostGIS Geometry plus a GiST spatial index.
- Feature attributes are stored in JSONB with a GIN index.
- Bounding-box, nearest-feature and distance primitives are exposed as SQL RPC functions.
- Heavy raster/ETL work stays outside Vercel and should be executed by the processing worker.

## Security

Every GIS table has RLS. Workspace membership is the authorization boundary. The server-only service role must never be exposed to the browser.

PostGIS should be installed in the `extensions` schema rather than `public`, following current Supabase guidance.
