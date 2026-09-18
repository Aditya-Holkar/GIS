import { NextResponse } from "next/server";
import { configuredServices } from "../../../../lib/gis/config";

export async function GET() {
  return NextResponse.json({
    services: configuredServices(),
    mode: "free-first",
    note: "Unset services remain optional until external credentials are configured.",
  });
}
