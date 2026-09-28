"use client";

import { FLS_LOGO } from "./countSheetLogos";

function esc(v: string | number): string {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Print the "WEEKLY CYCLE COUNT" form: FLS logo, a
 * titled header block (repeated on every page), a compact portrait table with
 * blank Count + Remark columns to fill in by hand, and a signature footer.
 */
export function printCountSheet(opts: {
  meta?: string[];
  showSys?: boolean;
  /** Big heading & tab title. Default "WEEKLY CYCLE COUNT" (e.g. pass
   *  "MONTHLY CYCLE COUNT" for the monthly sheet). */
  sheetTitle?: string;
  /** Force a page break after this many data rows (default 60). */
  rowsPerPage?: number;
  /** rows: [sapCode, description, lot, location, sysQtyText, countText?].
   *  countText fills the Count column (for a completed/history record); omit or
   *  "" for a blank sheet to write by hand. */
  rows: [string, string, string, string, string, string?][];
}) {
  const w = window.open("", "_blank", "width=1000,height=900");
  if (!w) { alert("เบราว์เซอร์บล็อกหน้าต่างพิมพ์ — กรุณาอนุญาต pop-up (ป๊อปอัพ) สำหรับเว็บนี้ แล้วลองกดพิมพ์อีกครั้ง"); return; }
  const sheetTitle = opts.sheetTitle ?? "WEEKLY CYCLE COUNT";
  const rowsPerPage = Math.max(1, opts.rowsPerPage ?? 60);
  const showSys = opts.showSys ?? false;
  const meta = (opts.meta ?? []).map((m) => esc(m)).join(" &nbsp;·&nbsp; ");
  const headCells = [
    "No.",
    "SAP Material Master",
    "Material Description",
    "Lot",
    "Location",
    ...(showSys ? ["System"] : []),
    "Count (นับจริง)",
    "Remark",
  ];
  // Column widths tuned against A4 portrait width. Cells wrap (no clipping), so
  // long values — SAP code, description, lot, or a long Location name — stay
  // fully readable by flowing onto extra lines instead of being cut off with "…".
  // "No." widened to fit a 3-digit row number without wrapping; the extra width
  // is taken from the SAP Material Master column.
  const widths = showSys
    ? ["5%", "7%", "33%", "16%", "9%", "6%", "14%", "10%"]
    : ["5%", "9%", "33%", "16%", "10%", "15.5%", "11.5%"];
  // Per-column data alignment: No + SAP + Location centred, Lot + System right, rest left.
  const aligns = showSys
    ? ["center", "center", "left", "right", "center", "right", "left", "left"]
    : ["center", "center", "left", "right", "center", "left", "left"];
  const head = headCells
    .map((h, i) => `<th style="width:${widths[i] ?? ""}"${i === 2 ? ' class="wrap"' : ""}>${esc(h)}</th>`)
    .join("");
  const body = opts.rows.length
    ? opts.rows
        .map((r, i) => {
          const cells = [
            String(i + 1),
            r[0],
            r[1],
            r[2],
            r[3],
            ...(showSys ? [r[4]] : []),
            r[5] ?? "", // Count — value for a record, blank to write by hand
            "", // Remark — blank to write
          ];
          // Force a fresh page every `rowsPerPage` rows (but not after the last).
          const brk = (i + 1) % rowsPerPage === 0 && i < opts.rows.length - 1 ? " pbr" : "";
          return `<tr${brk ? ` class="${brk.trim()}"` : ""}>${cells
            .map((c, ci) => {
              // All cells wrap so nothing is clipped; the write cols keep a min width.
              const cls = [ci >= cells.length - 2 ? "write" : ""].filter(Boolean).join(" ");
              const al = aligns[ci] && aligns[ci] !== "left" ? ` style="text-align:${aligns[ci]}"` : "";
              return `<td${cls ? ` class="${cls}"` : ""}${al}>${esc(c)}</td>`;
            })
            .join("")}</tr>`;
        })
        .join("")
    : `<tr><td colspan="${headCells.length}">—</td></tr>`;

  w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${esc(sheetTitle)}</title>
<style>
  @page { size: portrait; margin: 7mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
  html, body { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  body { font-family:'Aptos Narrow',Arial,sans-serif; color:#16202e; margin:0; padding:0; }
  .hdr { display:flex; align-items:center; gap:10px; border-bottom:1.5px solid #16202e; padding-bottom:4px; margin-bottom:5px; }
  .hdr img { height:30px; width:auto; }
  .hdr .ttl { flex:1; text-align:center; }
  .hdr .ttl h1 { margin:0; font-size:15px; letter-spacing:.5px; }
  .hdr .ttl .m { color:#5a6675; font-size:9px; margin-top:1px; }
  table { width:100%; border-collapse:collapse; table-layout:fixed; }
  thead { display:table-header-group; }
  tr { page-break-inside:avoid; }
  th { background:#12557e; color:#fff; border:1px solid #9fb0c3; padding:2px 3px; text-align:center; vertical-align:middle; font-size:7pt; line-height:1.1; white-space:normal; text-transform:uppercase; font-weight:bold; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  td { border:1px solid #b9c2cd; padding:1px 4px; font-size:7.5pt; line-height:1.1; height:0.4cm; white-space:normal; overflow:visible; word-break:break-word; overflow-wrap:anywhere; vertical-align:middle; }
  th.wrap { white-space:normal; }
  td.write { min-width:52px; }
  tbody tr { height:0.4cm; }
  tbody tr:nth-child(even) td { background:#f2f6f9; }
  tr.pbr { break-after:page; page-break-after:always; }
  @media print {
    th { background:#12557e !important; color:#fff !important; }
    tbody tr:nth-child(even) td { background:#f2f6f9 !important; }
  }
  .sig { margin-top:30px; display:flex; justify-content:space-around; gap:26px; page-break-inside:avoid; }
  .sig > div { flex:1; max-width:30%; text-align:center; font-size:9.5px; color:#3a4658; }
  .sig .wl { height:46px; border-bottom:1px solid #333; margin-bottom:5px; }
</style></head><body>
<div class="hdr">
  <img src="${FLS_LOGO}" alt="FLS"/>
  <div class="ttl"><h1>${esc(sheetTitle)}</h1>${meta ? `<div class="m">${meta}</div>` : ""}</div>
</div>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
<div class="sig">
  <div><div class="wl"></div>Counted by (ผู้นับ)</div>
  <div><div class="wl"></div>Checked by (ผู้ตรวจ)</div>
  <div><div class="wl"></div>Approved by (ผู้อนุมัติ)</div>
</div>
<script>
  function _print(){ try { window.focus(); window.print(); } catch(e){} }
  if (document.readyState === 'complete') setTimeout(_print, 300);
  else window.addEventListener('load', function(){ setTimeout(_print, 200); });
</script>
</body></html>`);
  w.document.close();
}

/**
 * Open a print window with a clean, full-width table that uses the Aptos Narrow
 * font and prints landscape so it fills the paper.
 */
export function printTable(opts: {
  title: string;
  meta?: string[];
  headers: string[];
  rows: (string | number)[][];
  signatures?: string[];
  /** Page orientation. Default "landscape" (fills wide exports); use "portrait"
   *  for long narrow lists like the count sheet so more rows fit per page. */
  orientation?: "landscape" | "portrait";
  /** Compact = smaller fonts + tighter rows → many more rows per printed page. */
  compact?: boolean;
}) {
  const w = window.open("", "_blank", "width=1000,height=900");
  if (!w) { alert("เบราว์เซอร์บล็อกหน้าต่างพิมพ์ — กรุณาอนุญาต pop-up (ป๊อปอัพ) สำหรับเว็บนี้ แล้วลองกดพิมพ์อีกครั้ง"); return; }
  const orientation = opts.orientation ?? "landscape";
  const compact = opts.compact ?? false;
  const meta = (opts.meta ?? []).map((m) => esc(m)).join(" &nbsp;·&nbsp; ");
  const head = opts.headers.map((h) => `<th>${esc(h)}</th>`).join("");
  const body = opts.rows.length
    ? opts.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${opts.headers.length}">—</td></tr>`;
  const thPad = compact ? "1px 6px" : "3px 9px";
  const tdPad = compact ? "0 6px" : "1px 9px";
  const fs = "11pt"; // Aptos Narrow 11 everywhere
  const margin = compact ? "8mm" : "12mm";
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${esc(opts.title)}</title>
<style>
  @page { size: ${orientation}; margin: ${margin}; }
  * { box-sizing: border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
  html, body { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  body { font-family:'Aptos Narrow',Arial,sans-serif; color:#16202e; margin:0; padding:${compact ? "10px 12px" : "18px 22px"}; }
  @media print { th { background:#12557e !important; color:#fff !important; } tr:nth-child(even) td { background:#eef4f8 !important; } }
  h2 { margin:0 0 4px; font-size:${compact ? "16px" : "20px"}; }
  .sub { color:#5a6675; font-size:${compact ? "11px" : "12.5px"}; margin-bottom:${compact ? "8px" : "14px"}; }
  table { width:100%; border-collapse:collapse; }
  thead { display:table-header-group; } /* repeat the header on every printed page */
  tr { page-break-inside:avoid; }
  th { background:#12557e; color:#fff; border:1px solid #9fb0c3; padding:${thPad}; text-align:left; font-size:${fs}; line-height:1; white-space:nowrap; }
  td { border:1px solid #d0d7de; padding:${tdPad}; font-size:${fs}; line-height:1; height:0.37cm; }
  tbody tr { height:0.37cm; } /* Aptos Narrow 11 · row height 0.37cm */
  tr:nth-child(even) td { background:#eef4f8; }
  tfoot { color:#8a97a5; font-size:11px; }
  .sig { margin-top:${compact ? "28px" : "56px"}; display:flex; justify-content:space-around; gap:40px; }
  .sig div { flex:1; max-width:38%; border-top:1px solid #333; padding-top:6px; text-align:center; font-size:12px; }
</style></head><body>
<h2>${esc(opts.title)}</h2>
${meta ? `<div class="sub">${meta}</div>` : ""}
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
${opts.signatures && opts.signatures.length ? `<div class="sig">${opts.signatures.map((s) => `<div>${esc(s)}</div>`).join("")}</div>` : ""}
<script>
  function _print(){ try { window.focus(); window.print(); } catch(e){} }
  if (document.readyState === 'complete') setTimeout(_print, 300);
  else window.addEventListener('load', function(){ setTimeout(_print, 200); });
</script>
</body></html>`);
  w.document.close();
}
