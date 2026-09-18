import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "gis-studio",
    version: "0.2.0",
    capabilities: ["catalog", "geojson", "ogc-ready", "analysis-ready", "3d-ready"],
    timestamp: new Date().toISOString(),
  });
}
