import { NextRequest, NextResponse } from "next/server";

const RPC_MAP = {
  view: "gis_features_in_view",
  nearby: "gis_nearby_features",
  distance: "gis_feature_distance",
} as const;

type Operation = keyof typeof RPC_MAP;

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json(
      { error: "Supabase is not configured", required: ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] },
      { status: 503 },
    );
  }

  // Forward the caller's Supabase access token. Never use the service-role key
  // in a browser-facing route: PostGIS RPC authorization is enforced by RLS.
  const authorization = request.headers.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as
    { operation?: Operation; params?: Record<string, unknown> } | null;

  if (!body?.operation || !(body.operation in RPC_MAP)) {
    return NextResponse.json(
      { error: "operation must be one of: view, nearby, distance" },
      { status: 400 },
    );
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/${RPC_MAP[body.operation]}`,
    {
      method: "POST",
      headers: {
        apikey: publishableKey,
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body.params ?? {}),
      cache: "no-store",
    },
  );

  const text = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return NextResponse.json(data, { status: response.status });
}
