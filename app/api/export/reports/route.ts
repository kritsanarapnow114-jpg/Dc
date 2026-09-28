import { NextRequest } from "next/server";
import { getReportData } from "@/lib/views/reports";
import { toExcelHtml, excelResponse } from "@/lib/calc/csv";
import { fmtDateBE, parseISO, todayBangkok } from "@/lib/calc/date";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "receiving";
  const startParam = req.nextUrl.searchParams.get("start");
  const endParam = req.nextUrl.searchParams.get("end");

  const today = todayBangkok();
  const defaultStart = new Date(today);
  defaultStart.setDate(defaultStart.getDate() - 29);

  const range = {
    start: startParam ? parseISO(startParam) : defaultStart,
    end: endParam ? parseISO(endParam) : today,
  };

  const data = await getReportData(range);

  switch (type) {
    case "issuing": {
      const html = toExcelHtml("Report",
        ["SAP Material Master", "Material Description", "Date", "Qty", "Unit", "Lot", "Issued To", "Mat.Doc (SAP)", "Remark", "Doc No."],
        data.issuing.rows.map((r) => [r.code, r.name, fmtDateBE(new Date(r.docDate)), r.qty, r.unit, r.lotNo, r.issueTo, r.materialDoc, r.remark, r.docNo])
      );
      return excelResponse("report-issuing.xls", html);
    }
    case "loss": {
      const html = toExcelHtml("Report",
        ["SAP Material Master", "Material Description", "Date", "Qty short", "Value", "Lot", "Location", "Reason", "Doc No."],
        data.loss.rows.map((r) => [r.code, r.name, fmtDateBE(new Date(r.docDate)), r.qty, Math.round(r.value), r.lotNo, r.locationCode, r.reason, r.docNo])
      );
      return excelResponse("report-loss.xls", html);
    }
    case "returns": {
      const html = toExcelHtml("Report",
        ["SAP Material Master", "Material Description", "Date", "Qty", "Unit", "Lot", "Disposition", "Location", "Customer", "Reason", "Ref. Issue", "Doc No."],
        data.returns.rows.map((r) => [r.code, r.name, fmtDateBE(new Date(r.docDate)), r.qty, r.unit, r.lotNo, r.disposition, r.locationCode, r.customer, r.reason, r.issueDocNo, r.docNo])
      );
      return excelResponse("report-returns.xls", html);
    }
    case "po": {
      const html = toExcelHtml("Report",
        ["SAP Material Master", "Material Description", "Date", "Ordered", "Received", "Remaining", "Vendor", "Status", "PO No."],
        data.po.rows.map((r) => [r.code, r.name, fmtDateBE(new Date(r.date)), r.ordered, r.received, r.remaining, r.vendor, r.status, r.no])
      );
      return excelResponse("report-po.xls", html);
    }
    case "transfer": {
      const html = toExcelHtml("Report",
        ["SAP Material Master", "Material Description", "Date", "Qty", "Unit", "Lot", "From", "To", "Operator", "Doc No."],
        data.transfer.rows.map((r) => [r.code, r.name, fmtDateBE(new Date(r.docDate)), r.qty, r.unit, r.lotNo, r.fromLocationCode, r.toLocationCode, r.operator, r.docNo])
      );
      return excelResponse("report-transfer.xls", html);
    }
    case "count": {
      const html = toExcelHtml("Report",
        ["SAP Material Master", "Material Description", "Date", "System", "Counted", "Variance", "Lot", "Location", "Zone", "Doc No."],
        data.count.rows.map((r) => [r.code, r.name, fmtDateBE(new Date(r.docDate)), r.sysQty, r.countedQty, r.variance, r.lotNo, r.locationCode, r.pullZone, r.docNo])
      );
      return excelResponse("report-count.xls", html);
    }
    case "receiving":
    default: {
      const html = toExcelHtml("Report",
        ["SAP Material Master", "Material Description", "Date", "Qty", "Unit", "Lot", "Location", "Mat.Doc (SAP)", "Remark", "Mode", "PO Ref.", "Doc No."],
        data.receiving.rows.map((r) => [r.code, r.name, fmtDateBE(new Date(r.docDate)), r.qty, r.unit, r.lotNo, r.locationCode, r.materialDoc, r.remark, r.mode, r.poNo ?? "—", r.docNo])
      );
      return excelResponse("report-receiving.xls", html);
    }
  }
}
