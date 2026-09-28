import { NextRequest } from "next/server";
import { getLocationRows } from "@/lib/views/locations";
import { toExcelHtml, excelResponse } from "@/lib/calc/csv";

export async function GET(req: NextRequest) {
  const zone = req.nextUrl.searchParams.get("zone") ?? undefined;
  const rows = await getLocationRows({ zone });

  const html = toExcelHtml("Locations",
    ["Bin", "Zone", "CapacityArea", "UsedArea", "Occupancy%", "Contents"],
    rows.map((r) => [
      r.code,
      r.zone,
      r.capArea,
      r.usedArea,
      r.pct,
      r.contents.map((c) => `${c.nameEn} x ${c.qty}`).join("; "),
    ])
  );

  return excelResponse("locations.xls", html);
}
