"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function ComparePeriods({
  aStart,
  aEnd,
  bStart,
  bEnd,
}: {
  aStart: string;
  aEnd: string;
  bStart: string;
  bEnd: string;
}) {
  const router = useRouter();
  const [a1, setA1] = useState(aStart);
  const [a2, setA2] = useState(aEnd);
  const [b1, setB1] = useState(bStart);
  const [b2, setB2] = useState(bEnd);

  function apply(na1 = a1, na2 = a2, nb1 = b1, nb2 = b2) {
    router.push(`/compare?aStart=${na1}&aEnd=${na2}&bStart=${nb1}&bEnd=${nb2}`);
  }

  function preset(kind: "30" | "month" | "year") {
    const today = new Date();
    if (kind === "30") {
      const na2 = today, na1 = addDays(today, -29);
      const nb2 = addDays(na1, -1), nb1 = addDays(nb2, -29);
      set(iso(na1), iso(na2), iso(nb1), iso(nb2));
    } else if (kind === "month") {
      const na1 = new Date(today.getFullYear(), today.getMonth(), 1);
      const na2 = today;
      const nb1 = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const nb2 = new Date(today.getFullYear(), today.getMonth(), 0);
      set(iso(na1), iso(na2), iso(nb1), iso(nb2));
    } else {
      const na1 = new Date(today.getFullYear(), 0, 1);
      const na2 = today;
      const nb1 = new Date(today.getFullYear() - 1, 0, 1);
      const nb2 = new Date(today.getFullYear() - 1, 11, 31);
      set(iso(na1), iso(na2), iso(nb1), iso(nb2));
    }
  }
  function set(na1: string, na2: string, nb1: string, nb2: string) {
    setA1(na1); setA2(na2); setB1(nb1); setB2(nb2);
    apply(na1, na2, nb1, nb2);
  }

  const field = "font-num rounded-[8px] border border-[#d7dce4] px-2 py-1.5 text-[12.5px] outline-none focus:border-[#2f86cf]";

  return (
    <div className="rounded-[14px] border border-[#e7ebf1] bg-white p-4 shadow-[0_1px_3px_rgba(20,30,48,.04)]">
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="text-[12px] font-semibold text-[#69748a]">ชุดเทียบด่วน:</span>
        <button onClick={() => preset("30")} className="rounded-[8px] border border-[#d7dce4] bg-white px-2.5 py-1 text-[12px] font-medium text-[#3a4658] hover:border-[#2f86cf]">30 วันนี้ vs 30 วันก่อน</button>
        <button onClick={() => preset("month")} className="rounded-[8px] border border-[#d7dce4] bg-white px-2.5 py-1 text-[12px] font-medium text-[#3a4658] hover:border-[#2f86cf]">เดือนนี้ vs เดือนก่อน</button>
        <button onClick={() => preset("year")} className="rounded-[8px] border border-[#d7dce4] bg-white px-2.5 py-1 text-[12px] font-medium text-[#3a4658] hover:border-[#2f86cf]">ปีนี้ vs ปีก่อน</button>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-[#2f86cf]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2f86cf]" /> ช่วง A (ช่วงนี้)
          </div>
          <div className="flex items-center gap-1.5">
            <input type="date" value={a1} onChange={(e) => setA1(e.target.value)} className={field} />
            <span className="text-[#9aa4b4]">–</span>
            <input type="date" value={a2} onChange={(e) => setA2(e.target.value)} className={field} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-[#8a94a6]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#8a94a6]" /> ช่วง B (เทียบกับ)
          </div>
          <div className="flex items-center gap-1.5">
            <input type="date" value={b1} onChange={(e) => setB1(e.target.value)} className={field} />
            <span className="text-[#9aa4b4]">–</span>
            <input type="date" value={b2} onChange={(e) => setB2(e.target.value)} className={field} />
          </div>
        </div>
        <button
          onClick={() => apply()}
          className="rounded-[9px] bg-[#2f86cf] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1f66a6]"
        >
          เทียบ
        </button>
      </div>
    </div>
  );
}
