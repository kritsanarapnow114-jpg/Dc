import { buildStockCard } from "@/lib/calc/stockCard";
import { toExcelHtml, excelResponse } from "@/lib/calc/csv";
import { fmtDateBE } from "@/lib/calc/date";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const entries = await buildStockCard(code);
  const balance = entries.length > 0 ? entries[entries.length - 1].balance : 0;

  const rows: (string | number)[][] = entries.map((e) => [
    fmtDateBE(e.date),
    e.doc,
    e.type,
    e.lot,
    e.in,
    e.out,
    e.balance,
  ]);

  rows.push(["", "", "", "", "", "", ""]);
  rows.push(["", "", "", "", "", "ยอดในสต็อก", balance]);

  const html = toExcelHtml("Stock Card", ["Date", "Doc", "Type", "Lot", "In", "Out", "Balance"], rows);
  return excelResponse(`stock-card-${code}.xls`, html);
}
