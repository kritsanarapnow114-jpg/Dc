/**
 * FEFO (First-Expired-First-Out) lot selection for Issue.
 * Lots on QC hold are never eligible.
 * Ordering date per lot: expiry date if it has one; otherwise the manufacture
 * (production) date; otherwise the receive date. This way packaging and other
 * no-expiry items still draw oldest-first (by production, then receipt) instead
 * of in an arbitrary order. Ties are broken by location code ascending.
 */

export type FefoLot = {
  id: string;
  lotNo: string;
  qty: number;
  status: "OK" | "QC";
  expDate: Date | null;
  mfgDate?: Date | null;
  recvDate?: Date | null;
  locationCode: string;
};

/** The date a lot is ordered by: expiry → manufacture → receive. */
function orderDate(l: FefoLot): number {
  const d = l.expDate ?? l.mfgDate ?? l.recvDate ?? null;
  return d ? d.getTime() : Number.POSITIVE_INFINITY;
}

export function fefoSort<T extends FefoLot>(lots: T[]): T[] {
  return [...lots].sort((a, b) => {
    const ad = orderDate(a);
    const bd = orderDate(b);
    if (ad !== bd) return ad - bd;
    return a.locationCode.localeCompare(b.locationCode);
  });
}

/** Lots eligible for issue: not on QC hold, has remaining qty. FEFO-ordered. */
export function eligibleLots<T extends FefoLot>(lots: T[]): T[] {
  return fefoSort(lots.filter((l) => l.status !== "QC" && l.qty > 0));
}

export function fefoLotFor<T extends FefoLot>(lots: T[]): T | null {
  return eligibleLots(lots)[0] ?? null;
}

export type FifoLot = {
  id: string;
  lotNo: string;
  qty: number;
  status: "OK" | "QC";
  recvDate: Date;
};

/** FIFO (First-In-First-Out): eligible lots ordered by received date ascending
 *  (oldest first). Used for BOM material consumption — those materials have no
 *  expiry and should be drawn oldest-stock-first. */
export function fifoLots<T extends FifoLot>(lots: T[]): T[] {
  return [...lots]
    .filter((l) => l.status !== "QC" && l.qty > 0)
    .sort((a, b) => {
      const d = a.recvDate.getTime() - b.recvDate.getTime();
      return d !== 0 ? d : a.lotNo.localeCompare(b.lotNo);
    });
}
