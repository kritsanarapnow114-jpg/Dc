"use server";

import { getReportData } from "@/lib/views/reports";
import { fmtDateBE, parseISO, todayBangkok } from "@/lib/calc/date";
import { ReportType, ReportRows } from "@/lib/reportTypes";

/** Load one report's rows for on-screen preview (before the user exports). The
 *  columns/values mirror the Excel export so what you see is what you get. */
export async function getReportRowsAction(input: {
  type: ReportType;
  start: string;
  end: string;
}): Promise<ReportRows> {
  const today = todayBangkok();
  const range = {
    start: input.start ? parseISO(input.start) : today,
    end: input.end ? parseISO(input.end) : today,
  };
  const data = await getReportData(range);
  const d = (v: string) => fmtDateBE(new Date(v));

  switch (input.type) {
    case "receiving":
      return {
        cols: ["SAP Material Master", "Material Description", "Date", "Qty", "Unit", "Lot", "Location", "Mat.Doc (SAP)", "Remark", "Mode", "Doc No."],
        rows: data.receiving.rows.map((r) => [r.code, r.name, d(r.docDate), r.qty, r.unit, r.lotNo, r.locationCode, r.materialDoc || "—", r.remark || "—", r.mode, r.docNo]),
      };
    case "issuing":
      return {
        cols: ["SAP Material Master", "Material Description", "Date", "Qty", "Unit", "Lot", "Issued To", "Mat.Doc (SAP)", "Remark", "Doc No."],
        rows: data.issuing.rows.map((r) => [r.code, r.name, d(r.docDate), r.qty, r.unit, r.lotNo, r.issueTo, r.materialDoc || "—", r.remark || "—", r.docNo]),
      };
    case "loss":
      return {
        cols: ["SAP Material Master", "Material Description", "Date", "Qty short", "Value", "Lot", "Location", "Reason", "Doc No."],
        rows: data.loss.rows.map((r) => [r.code, r.name, d(r.docDate), r.qty, `฿${Math.round(r.value).toLocaleString()}`, r.lotNo, r.locationCode, r.reason, r.docNo]),
      };
    case "returns":
      return {
        cols: ["SAP Material Master", "Material Description", "Date", "Qty", "Unit", "Lot", "Disposition", "Location", "Customer", "Reason", "Ref. Issue", "Doc No."],
        rows: data.returns.rows.map((r) => [r.code, r.name, d(r.docDate), r.qty, r.unit, r.lotNo, r.disposition, r.locationCode || "—", r.customer || "—", r.reason, r.issueDocNo || "—", r.docNo]),
      };
    case "po":
      return {
        cols: ["SAP Material Master", "Material Description", "Date", "Ordered", "Received", "Remaining", "Vendor", "Status", "PO No."],
        rows: data.po.rows.map((r) => [r.code, r.name, d(r.date), r.ordered, r.received, r.remaining, r.vendor, r.status, r.no]),
      };
    case "transfer":
      return {
        cols: ["SAP Material Master", "Material Description", "Date", "Qty", "Unit", "Lot", "From", "To", "Operator", "Doc No."],
        rows: data.transfer.rows.map((r) => [r.code, r.name, d(r.docDate), r.qty, r.unit, r.lotNo, r.fromLocationCode, r.toLocationCode, r.operator, r.docNo]),
      };
    case "count":
      return {
        cols: ["SAP Material Master", "Material Description", "Date", "System", "Counted", "Variance", "Lot", "Location", "Zone", "Doc No."],
        rows: data.count.rows.map((r) => [r.code, r.name, d(r.docDate), r.sysQty, r.countedQty, r.variance > 0 ? `+${r.variance.toLocaleString()}` : r.variance.toLocaleString(), r.lotNo, r.locationCode, r.pullZone, r.docNo]),
      };
    default:
      return { cols: [], rows: [] };
  }
}
