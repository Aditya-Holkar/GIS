import { NextResponse } from "next/server";

function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371.0088;
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const lat1 = rad(a[1]);
  const lat2 = rad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const a = body?.a as [number, number] | undefined;
  const b = body?.b as [number, number] | undefined;

  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== 2 || b.length !== 2) {
    return NextResponse.json({ error: "Expected a and b as [longitude, latitude]." }, { status: 400 });
  }

  return NextResponse.json({ distanceKm: Number(haversineKm(a, b).toFixed(4)), units: "km", method: "Haversine / WGS84 sphere" });
}
