import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase server configuration missing" }, { status: 503 });
  const auth = request.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => null) as { path?: string; expiresIn?: number } | null;
  if (!body?.path) return NextResponse.json({ error: "path is required" }, { status: 400 });
  const expiresIn = Math.max(60, Math.min(body.expiresIn ?? 3600, 86400));
  const path = body.path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${url}/storage/v1/object/sign/gis-datasets/${path}`, {
    method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn }), cache: "no-store",
  });
  const text = await response.text(); let data: unknown; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return NextResponse.json(data, { status: response.status });
}
