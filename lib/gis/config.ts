export const gisConfig = {
  database: process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? "",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  objectStorageEndpoint: process.env.R2_ENDPOINT ?? "",
  objectStorageBucket: process.env.R2_BUCKET ?? "",
  redisUrl: process.env.UPSTASH_REDIS_REST_URL ?? "",
  processorUrl: process.env.PROCESSOR_URL ?? "",
} as const;

export function configuredServices() {
  return {
    database: Boolean(gisConfig.database),
    objectStorage: Boolean(gisConfig.objectStorageEndpoint && gisConfig.objectStorageBucket),
    queue: Boolean(gisConfig.redisUrl),
    processingWorker: Boolean(gisConfig.processorUrl),
  };
}
