import { NextRequest, NextResponse } from "next/server";

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160);
}

export async function POST(request: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase server configuration missing" }, { status: 503 });
  const auth = request.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => null) as { workspaceId?: string; datasetId?: string; filename?: string; contentType?: string } | null;
  if (!body?.workspaceId || !body?.datasetId || !body?.filename) return NextResponse.json({ error: "workspaceId, datasetId and filename are required" }, { status: 400 });
  const path = `${safeSegment(body.workspaceId)}/${safeSegment(body.datasetId)}/original/${Date.now()}-${safeSegment(body.filename)}`;
  const response = await fetch(`${url}/storage/v1/object/upload/sign/gis-datasets/${path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST", headers: { apikey: key, Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ upsert: false }), cache: "no-store",
  });
  const text = await response.text(); let data: unknown; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!response.ok) return NextResponse.json(data, { status: response.status });
  return NextResponse.json({ ...(data as object), bucket: "gis-datasets", path, contentType: body.contentType ?? "application/octet-stream" });
}
