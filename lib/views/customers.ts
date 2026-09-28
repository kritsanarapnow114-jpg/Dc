import "server-only";
import { db } from "@/lib/db";

/** Customers with their ship-to addresses (default address first). */
export async function getCustomers() {
  const customers = await db.customer.findMany({
    include: { shipTos: { orderBy: [{ isDefault: "desc" }, { label: "asc" }] } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return customers.map((c) => ({
    id: c.id,
    code: c.code ?? "",
    name: c.name,
    phone: c.phone ?? "",
    taxId: c.taxId ?? "",
    active: c.active,
    shipTos: c.shipTos.map((s) => ({
      id: s.id,
      label: s.label,
      address: s.address,
      isDefault: s.isDefault,
    })),
  }));
}

export type CustomerRow = Awaited<ReturnType<typeof getCustomers>>[number];
export type ShipToRow = CustomerRow["shipTos"][number];
