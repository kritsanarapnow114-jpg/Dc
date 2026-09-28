import { NextRequest } from "next/server";
import { getProductRows } from "@/lib/views/products";
import { toExcelHtml, excelResponse } from "@/lib/calc/csv";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const cat = req.nextUrl.searchParams.get("cat") ?? undefined;
  const rows = await getProductRows({ q, category: cat });

  const html = toExcelHtml("Products",
    [
      "SAP Material Master",
      "Material Description (EN)",
      "Material Description (TH)",
      "Category",
      "OnHand",
      "Unit",
      "UnitPrice",
      "TotalValue",
      "Locations",
      "Status",
    ],
    rows.map((r) => [
      r.code,
      r.nameEn,
      r.nameTh ?? "",
      r.categoryLabel,
      r.onHand,
      r.unit,
      r.price,
      r.totalValue,
      r.locations.join("; "),
      r.status,
    ])
  );

  return excelResponse("products.xls", html);
}
