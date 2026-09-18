# GIS Studio

A modern, extensible GIS / geospatial intelligence platform built with **Next.js 16 + React + TypeScript + OpenLayers**.

## Vision

GIS Studio combines the strongest ideas from mature open geospatial platforms into one application:

- **GeoNode-inspired** data/catalog/metadata/sharing workflows.
- **TerriaJS-inspired** catalog-driven layer exploration, 2D/3D map experiences and web-service interoperability.
- **QGIS-inspired** analysis, styling, measurement, editing and OGC service workflows.
- **OpenLayers** for the primary high-performance 2D map engine.
- **CesiumJS-ready architecture** for a future high-precision 3D globe / terrain / 3D Tiles engine.

The implementation is original application code; it does not copy proprietary source code or assets from other products.

## Current implementation

- Next.js App Router + TypeScript.
- Dark professional GIS workspace UI.
- Interactive OpenStreetMap/OpenLayers map.
- Layer panel with visibility state.
- Dataset catalog shell.
- Analysis tool shell.
- 2D / 3D mode control (3D is currently a map-mode preview; Cesium integration is planned).
- Responsive workspace/sidebar.
- Foundation for OGC services, PostGIS, authentication, processing jobs and AI-assisted GIS.

## Architecture roadmap

### Phase 1 — Platform foundation
- [x] Next.js application shell
- [x] OpenLayers 2D map
- [x] Layer/catalog UI
- [x] Analysis UI
- [ ] Persistent PostGIS data model
- [ ] Auth/RBAC
- [ ] API layer

### Phase 2 — Real GIS data
- GeoJSON/CSV/KML/Shapefile ingestion
- PostGIS storage
- Raster metadata and COG support
- OGC API Features
- WMS/WMTS/WFS connectors
- Metadata editor and catalog search

### Phase 3 — GIS analysis
- Buffer, clip, intersect, dissolve
- Spatial joins and proximity
- Raster operations
- Network routing
- Measurement and drawing
- Job queue and progress monitoring

### Phase 4 — Advanced visualization
- CesiumJS 3D globe
- Terrain and 3D Tiles
- Time-enabled layers
- 3D buildings / point clouds
- 360/panoramic imagery

### Phase 5 — Collaboration & intelligence
- Workspaces and projects
- Sharing and permissions
- Comments/annotations
- Audit trail
- AI GIS copilot
- Natural-language spatial queries

### Phase 6 — Production
- PostgreSQL/PostGIS
- Object storage
- Redis/queue
- Observability
- Docker deployment
- Vercel-compatible web frontend + GIS backend

## Sources / inspiration

- GeoNode: https://github.com/GeoNode/geonode
- TerriaJS: https://github.com/TerriaJS/terriajs
- OpenLayers: https://github.com/openlayers/openlayers
- QGIS Server documentation: https://docs.qgis.org/testing/en/docs/server_manual/
- CesiumJS: https://cesium.com/platform/cesiumjs

All third-party projects remain under their respective licenses. GIS Studio's code is original and should not copy GPL code into this repository unless deliberately done under compatible licensing.