"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { buttonClass } from "@/components/ui/Button";
import { saveAppSettingsAction } from "@/lib/actions/settings";
import { zoneLabelKey } from "@/lib/settingsKeys";
import { showToast } from "@/components/ui/Toast";

/** Edit the description shown under each zone (what that zone stores). */
export function ZoneLabelsEditor({
  zones,
  labels,
}: {
  zones: string[];
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...labels }));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const entries: Record<string, string> = {};
    for (const z of zones) entries[zoneLabelKey(z)] = values[z] ?? "";
    const res = await saveAppSettingsAction(entries).catch((e) => ({ error: String(e) }));
    setSaving(false);
    if (res && "error" in res && res.error) {
      showToast(res.error);
      return;
    }
    showToast("Zone descriptions saved (บันทึกคำอธิบายโซนแล้ว)");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-[8px] border border-[#d7dce4] bg-white px-3 py-2 text-[12.5px] font-medium text-[#3a4658] hover:bg-[#f7f9fb]"
      >
        ✎ แก้ไขคำอธิบายโซน
      </button>
      <Modal open={open} onClose={() => setOpen(false)} width={460}>
        <ModalHeader title="Zone descriptions (คำอธิบายโซน — เก็บประเภทไหน)" onClose={() => setOpen(false)} />
        <div className="flex flex-col gap-3 px-5 py-4">
          {zones.map((z) => (
            <label key={z} className="flex items-center gap-3">
              <span className="font-num w-[64px] flex-none text-[13px] font-semibold text-[#16202e]">
                Zone {z}
              </span>
              <input
                value={values[z] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [z]: e.target.value }))}
                placeholder="เช่น วัตถุดิบแห้ง / บรรจุภัณฑ์ / สินค้าสำเร็จรูป"
                className="min-w-0 flex-1 rounded-[8px] border border-[#d7dce4] px-2.5 py-2 text-[13px] outline-none focus:border-[#2f86cf]"
              />
            </label>
          ))}
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className={buttonClass("secondary")}>
              Cancel
            </button>
            <button disabled={saving} onClick={handleSave} className={buttonClass("primary")}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
