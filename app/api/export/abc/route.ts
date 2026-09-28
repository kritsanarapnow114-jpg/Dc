import { NextRequest } from "next/server";
import { getAbcAnalysis, AbcBasis } from "@/lib/views/abc";
import { toExcelHtml, excelResponse } from "@/lib/calc/csv";

export async function GET(req: NextRequest) {
  const basis: AbcBasis =
    req.nextUrl.searchParams.get("basis") === "usage" ? "usage" : "value";
  const { rows } = await getAbcAnalysis(basis);

  const html = toExcelHtml(
    "ABC Analysis",
    [
      "Rank",
      "Class",
      "SAP Material Master",
      "Material Description",
      "Category",
      "OnHand",
      "Unit",
      "UnitPrice",
      basis === "usage" ? "UsageValue90d" : "InventoryValue",
      "Share %",
      "Cumulative %",
    ],
    rows.map((r, i) => [
      i + 1,
      r.cls,
      r.code,
      r.name,
      r.categoryLabel,
      r.onHand,
      r.unit,
      r.price,
      Math.round(r.metric),
      r.pct.toFixed(1),
      r.cumPct.toFixed(1),
    ])
  );

  return excelResponse(`abc-${basis}.xls`, html);
}
