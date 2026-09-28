"use client";

import { useEffect, useState } from "react";

type ToastMsg = { id: number; text: string };

let listeners: ((t: ToastMsg) => void)[] = [];
let counter = 0;

export function showToast(text: string) {
  const msg = { id: ++counter, text };
  listeners.forEach((l) => l(msg));
}

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  useEffect(() => {
    const handler = (t: ToastMsg) => {
      setToasts((ts) => [...ts, t]);
      setTimeout(() => {
        setToasts((ts) => ts.filter((x) => x.id !== t.id));
      }, 2400);
    };
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((l) => l !== handler);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-2 rounded-[11px] bg-[#101826] px-4 py-2.5 text-[13px] text-white shadow-lg"
        >
          <span className="text-[#4ade80]">✓</span>
          {t.text}
        </div>
      ))}
    </div>
  );
}
