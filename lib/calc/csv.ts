function escapeCell(v: string | number): string {
  const s = String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** UTF-8 BOM-prefixed CSV (opens correctly in Excel, including Thai text). */
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((r) => r.map(escapeCell).join(",")),
  ];
  return "﻿" + lines.join("\r\n");
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function esc(v: string | number): string {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * An Excel-openable HTML sheet: Aptos Narrow font, a bold header band, borders,
 * zebra rows, and print set to landscape + fit-to-one-page-wide so it fills the
 * paper instead of leaving big empty margins. No dependency — Excel opens this
 * .xls file directly.
 */
export function toExcelHtml(sheet: string, headers: string[], rows: (string | number)[][]): string {
  const head = headers.map((h) => `<th>${esc(h)}</th>`).join("");
  const body = rows.length
    ? rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${headers.length}">—</td></tr>`;
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"/>
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${esc(sheet)}</x:Name><x:WorksheetOptions><x:Print><x:FitWidth>1</x:FitWidth><x:FitHeight>0</x:FitHeight><x:Layout x:Orientation="Landscape"/></x:Print><x:FitToPage/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
table{border-collapse:collapse;font-family:'Aptos Narrow',Arial,sans-serif;font-size:11pt}
th{background:#12557e;color:#ffffff;font-weight:bold;border:0.5pt solid #9fb0c3;padding:5px 10px;text-align:left;white-space:nowrap}
td{border:0.5pt solid #d0d7de;padding:4px 10px;mso-number-format:"\\@";vertical-align:middle}
tr:nth-child(even) td{background:#eef4f8}
</style></head><body><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

export function excelResponse(filename: string, html: string): Response {
  return new Response("﻿" + html, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
