# GIS object storage

Cloudflare R2 is no longer a required dependency. GIS Studio uses Supabase Storage as its first storage provider because the Supabase integration is already connected.

The provider boundary remains intentional: application code treats stored dataset objects as opaque paths, so a future S3/R2 provider can be introduced without changing the dataset model.

## Bucket

gis-datasets is private and organized as:

<workspace-id>/<dataset-id>/original/<timestamp>-<filename>

Derived artifacts can use derived/, exports/, and tiles/ beneath the dataset path.

For large GIS uploads, use Supabase resumable/TUS uploads. Supabase currently recommends resumable uploads for large files and unstable networks. Signed upload/download URLs are supported by the current Storage API.
