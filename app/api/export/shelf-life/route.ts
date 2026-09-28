import { getShelfLifeRows } from "@/lib/views/shelfLife";
import { toExcelHtml, excelResponse } from "@/lib/calc/csv";

export async function GET() {
  const rows = await getShelfLifeRows();
  const html = toExcelHtml(
    "Balance vs Shelf Life",
    ["Material Description", "Stock Balance (Kg.)", "Remaining Shelf Life (Days)"],
    rows.map((r) => [r.name, r.balanceKg, r.daysLeft ?? "—"])
  );
  return excelResponse("inventory-balance-vs-shelf-life.xls", html);
}
