import { NextResponse } from "next/server";

type Dataset = {
  id: string;
  name: string;
  description: string;
  type: "vector" | "raster" | "service";
  format: string;
  access: "public" | "team";
  crs: string;
  tags: string[];
};

const catalog: Dataset[] = [
  { id: "india-admin", name: "India Administrative Boundaries", description: "Administrative reference layers for national and state-level exploration.", type: "vector", format: "GeoJSON", access: "public", crs: "EPSG:4326", tags: ["india", "boundaries", "admin"] },
  { id: "population-2025", name: "Global Population 2025", description: "Population density surface prepared for thematic mapping.", type: "raster", format: "Cloud-optimized GeoTIFF", access: "public", crs: "EPSG:4326", tags: ["population", "density", "global"] },
  { id: "maharashtra-roads", name: "Road Network — Maharashtra", description: "Road network layer for routing and network analysis workflows.", type: "vector", format: "GeoPackage", access: "team", crs: "EPSG:4326", tags: ["roads", "routing", "maharashtra"] },
  { id: "landcover", name: "Land Use / Land Cover", description: "Thematic land-cover dataset for classification and change analysis.", type: "raster", format: "COG", access: "public", crs: "EPSG:4326", tags: ["landcover", "raster", "change"] },
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase();
  const type = url.searchParams.get("type");

  const results = catalog.filter((item) => {
    const matchesQ = !q || [item.name, item.description, ...item.tags].join(" ").toLowerCase().includes(q);
    const matchesType = !type || item.type === type;
    return matchesQ && matchesType;
  });

  return NextResponse.json({ items: results, total: results.length });
}
