import { NextResponse } from "next/server";

const LGD_BASE = "https://lgdirectory.gov.in/webservices/lgdws";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level");
  const code = searchParams.get("code");

  const targets: Record<string, string> = {
    districts: code ? `${LGD_BASE}/districtList?stateCode=${encodeURIComponent(code)}` : `${LGD_BASE}/stateList`,
    talukas: `${LGD_BASE}/subdistrictList?districtCode=${encodeURIComponent(code || "")}`,
    villages: `${LGD_BASE}/villageListWithHierarchy?subDistrictCode=${encodeURIComponent(code || "")}`,
  };

  if (!level || !(level in targets) || (level !== "districts" && !code)) {
    return NextResponse.json({ error: "Use level=districts|talukas|villages and provide code for talukas/villages." }, { status: 400 });
  }

  try {
    const response = await fetch(targets[level], {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!response.ok) {
      return NextResponse.json({ error: `LGD returned HTTP ${response.status}` }, { status: 502 });
    }
    const data = await response.json();
    return NextResponse.json({ source: "Government of India LGD", level, code, data }, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (error) {
    return NextResponse.json({ error: "Unable to reach the LGD service.", detail: error instanceof Error ? error.message : "Unknown error" }, { status: 502 });
  }
}
