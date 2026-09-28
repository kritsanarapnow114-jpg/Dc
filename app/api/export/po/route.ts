import { NextRequest } from "next/server";
import { getPurchaseOrders } from "@/lib/views/po";
import { toExcelHtml, excelResponse } from "@/lib/calc/csv";
import { fmtDateBE } from "@/lib/calc/date";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const rows = await getPurchaseOrders({ status });

  const html = toExcelHtml("Purchase Orders",
    ["PO No.", "Vendor", "Date", "Amount", "Received%", "Status"],
    rows.map((r) => [
      r.no,
      r.vendor,
      fmtDateBE(new Date(r.date)),
      r.amount,
      Math.round(r.receivedPct * 10) / 10,
      r.status,
    ])
  );

  return excelResponse("po.xls", html);
}
