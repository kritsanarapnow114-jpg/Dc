"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireWrite } from "@/lib/authz";
import { qualityBreakdown, accuracyBreakdown } from "@/lib/calc/kpi";
import { KpiKey } from "@prisma/client";

export async function getKpiLogsAction(key: KpiKey) {
  const logs = await db.kpiLog.findMany({
    where: { key },
    orderBy: { date: "desc" },
  });
  return logs.map((l) => ({
    id: l.id,
    date: l.date.toISOString(),
    detail: l.detail,
    amount: l.amount,
    incident: l.incident,
    issueDocNo: l.issueDocNo,
    onTime: l.onTime,
  }));
}

export type AddKpiLogState = { error?: string };

export async function addKpiLogAction(
  _prev: AddKpiLogState,
  formData: FormData
): Promise<AddKpiLogState> {
  try {
    await requireWrite();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Not allowed" };
  }
  const key = String(formData.get("key")) as KpiKey;
  const date = String(formData.get("date") ?? "");
  if (!date) return { error: "Pick a date (เลือกวันที่)" };

  if (key === "SAFETY") {
    // incident = a real safety incident; a "reset" entry (incident=false) just
    // sets the date the safe-days counter starts from, tied to no other date.
    const isIncident = formData.get("incident") !== "false";
    await db.kpiLog.create({
      data: {
        key,
        date: new Date(date),
        detail: String(formData.get("detail") ?? ""),
        incident: isIncident,
      },
    });
  } else if (key === "COST") {
    const amount = Number(formData.get("amount") ?? 0);
    await db.kpiLog.create({
      data: {
        key,
        date: new Date(date),
        detail: String(formData.get("detail") ?? ""),
        amount,
      },
    });
  } else if (key === "DELIVERY") {
    await db.kpiLog.create({
      data: {
        key,
        date: new Date(date),
        issueDocNo: String(formData.get("issueDocNo") ?? ""),
        onTime: formData.get("onTime") === "true",
      },
    });
  }

  revalidatePath("/dashboard");
  return {};
}

export async function getQualityBreakdownAction() {
  const rows = await qualityBreakdown();
  return rows.map((r) => ({ ...r, date: r.date.toISOString() }));
}

export async function getAccuracyBreakdownAction() {
  const rows = await accuracyBreakdown();
  return rows.map((r) => ({ ...r, date: r.date.toISOString() }));
}

export async function getRecentIssueDocsAction() {
  // Exclude issue docs already logged for Delivery so they can't be logged twice.
  const logged = await db.kpiLog.findMany({
    where: { key: "DELIVERY", issueDocNo: { not: null } },
    select: { issueDocNo: true },
  });
  const loggedSet = new Set(logged.map((l) => l.issueDocNo));
  const issues = await db.issue.findMany({
    where: { reversedAt: null },
    orderBy: { docDate: "desc" },
    take: 40,
    select: { docNo: true },
  });
  return issues.map((i) => i.docNo).filter((d) => !loggedSet.has(d));
}

/** Delete a single KPI log entry (Safety / Cost / Delivery). */
export async function deleteKpiLogAction(id: string) {
  await requireWrite();
  await db.kpiLog.delete({ where: { id } });
  revalidatePath("/dashboard");
  return { ok: true };
}
