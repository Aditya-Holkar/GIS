import { NextRequest, NextResponse } from "next/server";

const RPC_MAP = {
  view: "features_in_view",
  nearby: "nearby_features",
  distance: "feature_distance",
} as const;

type Operation = keyof typeof RPC_MAP;

function env(name: string) {
  return process.env[name];
}

export async function POST(request: NextRequest) {
  const supabaseUrl = env("SUPABASE_URL");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase is not configured", required: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null) as { operation?: Operation; params?: Record<string, unknown> } | null;
  if (!body?.operation || !(body.operation in RPC_MAP)) {
    return NextResponse.json({ error: "operation must be one of: view, nearby, distance" }, { status: 400 });
  }

  const params = body.params ?? {};
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/${RPC_MAP[body.operation]}`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
      cache: "no-store",
    },
  );

  const text = await response.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  return NextResponse.json(data, { status: response.status });
}
