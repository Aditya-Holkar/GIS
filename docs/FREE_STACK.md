# Free-first GIS infrastructure

The default development stack is intentionally free/open-source where practical.

## Recommended services

- Database: Supabase Free Postgres. The current free plan includes a 500 MB database and may pause after inactivity. PostGIS can be enabled in PostgreSQL.
- Object storage: Cloudflare R2 has a free monthly allowance of 10 GB-month standard storage, 1M Class A operations and 10M Class B operations, with free egress.
- Queue/cache: Upstash Redis Free includes 256 MB data, 10 GB monthly bandwidth and 500K commands/month.
- Processing: GDAL/OGR is open source under an MIT-style license. Use a small worker/container for GDAL, GEOS and PROJ rather than running heavy jobs inside Vercel functions.
- Web: Vercel can host the Next.js application.

## Important

Free tiers have quotas and may sleep, pause, rate-limit or require billing for higher usage. The application must expose providers through environment variables and keep the data layer replaceable.

## Environment contract

DATABASE_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
R2_ENDPOINT
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
PROCESSOR_URL
