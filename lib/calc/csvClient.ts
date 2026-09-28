"use client";

import { toCsv, toExcelHtml } from "./csv";

function download(filename: string, content: string, type: string) {
  const blob = new Blob(["﻿" + content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Client-side CSV download for data that only exists in-browser (e.g. an unconfirmed doc draft). */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  download(filename, toCsv(headers, rows), "text/csv;charset=utf-8");
}

/** Excel download (Aptos Narrow font, fills the page on print). */
export function downloadExcel(
  filename: string,
  sheet: string,
  headers: string[],
  rows: (string | number)[][]
) {
  download(filename, toExcelHtml(sheet, headers, rows), "application/vnd.ms-excel;charset=utf-8");
}
