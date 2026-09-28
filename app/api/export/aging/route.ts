import { NextRequest } from "next/server";
import { getAgingRows } from "@/lib/views/aging";
import { toExcelHtml, excelResponse } from "@/lib/calc/csv";
import { fmtDateBE } from "@/lib/calc/date";

export async function GET(req: NextRequest) {
  const filterParam = req.nextUrl.searchParams.get("filter");
  const filter: "all" | "near" | "expired" =
    filterParam === "near" || filterParam === "expired" ? filterParam : "all";
  const thresholdParam = req.nextUrl.searchParams.get("threshold");
  const thresholdDays = thresholdParam ? Number(thresholdParam) || 30 : 30;

  const rows = await getAgingRows({ filter, thresholdDays });

  const html = toExcelHtml("Aging",
    ["SAP Material Master", "Material Description(EN)", "Lot", "Location", "OnHand", "Value", "Received", "AgeDays", "Expiry"],
    rows.map((r) => [
      r.code,
      r.nameEn,
      r.lotNo,
      r.bins.map((b) => `${b.locationCode}:${b.onHand.toLocaleString()}`).join(", "),
      r.onHand,
      r.value,
      fmtDateBE(new Date(r.recvDate)),
      r.ageDays,
      r.expDate ? fmtDateBE(new Date(r.expDate)) : "—",
    ])
  );

  return excelResponse("aging.xls", html);
}
