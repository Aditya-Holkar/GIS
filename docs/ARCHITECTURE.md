# GIS Studio Architecture

GIS Studio is designed as a production geospatial platform rather than a map-only frontend.

## Runtime layers

- Web application: Next.js App Router + TypeScript.
- 2D cartography: OpenLayers for high-performance vector, tile and OGC workflows.
- 3D engine: CesiumJS integration is reserved for the dedicated 3D scene layer.
- Spatial database: PostgreSQL + PostGIS is the target system of record for vector geometries, spatial indexes and server-side geoprocessing.
- Object storage: large raster, GeoPackage, GeoTIFF and uploaded source files should live in object storage.
- Processing workers: GDAL / GEOS / PROJ based workers should execute heavy jobs outside serverless request lifecycles.
- OGC interoperability: WMS, WMTS, WFS and OGC API Features connectors should be normalized into the catalog model.
- AI GIS copilot: natural-language requests should resolve to auditable catalog queries, map state changes and geoprocessing jobs.

## Data flow

source -> ingestion -> validation -> metadata -> catalog -> spatial index -> map/analysis

Heavy processing follows:

user request -> job API -> queue -> worker -> artifact -> catalog -> map

## Security

Workspace, role and dataset permissions belong in the backend. Every mutating geospatial operation should be attributable to a user and recorded in an audit trail.

## Deployment boundary

Vercel is appropriate for the Next.js application, API orchestration and lightweight geospatial requests. Long-running raster processing, GDAL jobs, queues and PostGIS should be hosted as dedicated services and connected through environment variables.

## Current implementation

The repository includes the Next.js/OpenLayers foundation, health and catalog APIs, a geodesic distance endpoint, and CI. These APIs intentionally have no external database dependency yet, so the public deployment remains usable before PostGIS credentials are provisioned.
