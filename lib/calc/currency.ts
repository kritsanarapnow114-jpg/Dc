export type Currency = "THB" | "USD";

/** USD per THB, roughly ~35.7 THB = $1 */
export const USD_PER_THB = 0.028;

export function money(amountThb: number, currency: Currency): string {
  if (currency === "USD") {
    return "$" + Math.round(amountThb * USD_PER_THB).toLocaleString("en-US");
  }
  return "฿" + Math.round(amountThb).toLocaleString("en-US");
}

export function toggleCurrency(c: Currency): Currency {
  return c === "THB" ? "USD" : "THB";
}
