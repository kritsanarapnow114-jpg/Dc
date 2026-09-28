"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Currency, money, toggleCurrency } from "@/lib/calc/currency";

const CurrencyContext = createContext<{
  currency: Currency;
  toggle: () => void;
}>({ currency: "THB", toggle: () => {} });

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("THB");

  useEffect(() => {
    // One-time client-only read of a browser-only API (localStorage) to restore
    // the saved preference after hydration; intentionally not a lazy useState
    // initializer, since that would run on the server too and mismatch hydration.
    const saved = window.localStorage.getItem("nbc_currency");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "USD" || saved === "THB") setCurrency(saved);
  }, []);

  const toggle = () =>
    setCurrency((c) => {
      const next = toggleCurrency(c);
      window.localStorage.setItem("nbc_currency", next);
      return next;
    });

  return (
    <CurrencyContext.Provider value={{ currency, toggle }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

/** Renders a THB amount formatted in whichever currency the user has toggled to. */
export function Money({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const { currency } = useCurrency();
  return <span className={className}>{money(value, currency)}</span>;
}

export function CurrencyToggleButton() {
  const { currency, toggle } = useCurrency();
  return (
    <button
      onClick={toggle}
      title="Toggle currency"
      className="font-num rounded-[9px] border border-[#d7dce4] bg-white px-3 py-2 text-[13px] font-semibold text-[#3a4658]"
    >
      {currency} ⇄
    </button>
  );
}
