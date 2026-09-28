"use server";

import { safeRevalidate } from "./revalidate";
import { db } from "@/lib/db";
import { requireWrite } from "@/lib/authz";

function revalidateCustomers() {
  // The Issue (outbound) form and its picker depend on the customer list too.
  safeRevalidate(["/customers", "/issue"]);
}

export type CustomerInput = {
  code?: string | null;
  name: string;
  phone?: string | null;
  taxId?: string | null;
};

export async function createCustomerAction(input: CustomerInput) {
  try {
    await requireWrite();
    const name = input.name.trim();
    if (!name) return { error: "กรุณาใส่ชื่อลูกค้า (customer name required)" };
    const customer = await db.customer.create({
      data: {
        name,
        code: input.code?.trim() || null,
        phone: input.phone?.trim() || null,
        taxId: input.taxId?.trim() || null,
      },
    });
    revalidateCustomers();
    return { id: customer.id };
  } catch (e) {
    return { error: msg(e, "Failed to create customer.") };
  }
}

export async function updateCustomerAction(id: string, input: CustomerInput & { active?: boolean }) {
  try {
    await requireWrite();
    const name = input.name.trim();
    if (!name) return { error: "กรุณาใส่ชื่อลูกค้า (customer name required)" };
    await db.customer.update({
      where: { id },
      data: {
        name,
        code: input.code?.trim() || null,
        phone: input.phone?.trim() || null,
        taxId: input.taxId?.trim() || null,
        ...(input.active === undefined ? {} : { active: input.active }),
      },
    });
    revalidateCustomers();
    return { ok: true };
  } catch (e) {
    return { error: msg(e, "Failed to update customer.") };
  }
}

export async function deleteCustomerAction(id: string) {
  try {
    await requireWrite();
    // Past issues keep their snapshot (shipToName/address) and null out the link.
    await db.customer.delete({ where: { id } });
    revalidateCustomers();
    return { ok: true };
  } catch (e) {
    return { error: msg(e, "Failed to delete customer.") };
  }
}

export type ShipToInput = { label: string; address: string; isDefault?: boolean };

export async function addShipToAction(customerId: string, input: ShipToInput) {
  try {
    await requireWrite();
    const label = input.label.trim();
    const address = input.address.trim();
    if (!label || !address) return { error: "กรุณาใส่ชื่อที่อยู่และรายละเอียดที่อยู่ (label + address)" };
    await db.$transaction(async (tx) => {
      const count = await tx.shipToAddress.count({ where: { customerId } });
      // First address of a customer becomes the default automatically.
      const makeDefault = input.isDefault || count === 0;
      if (makeDefault) {
        await tx.shipToAddress.updateMany({ where: { customerId }, data: { isDefault: false } });
      }
      await tx.shipToAddress.create({
        data: { customerId, label, address, isDefault: makeDefault },
      });
    });
    revalidateCustomers();
    return { ok: true };
  } catch (e) {
    return { error: msg(e, "Failed to add ship-to address.") };
  }
}

export async function updateShipToAction(id: string, input: ShipToInput) {
  try {
    await requireWrite();
    const label = input.label.trim();
    const address = input.address.trim();
    if (!label || !address) return { error: "กรุณาใส่ชื่อที่อยู่และรายละเอียดที่อยู่ (label + address)" };
    await db.shipToAddress.update({ where: { id }, data: { label, address } });
    revalidateCustomers();
    return { ok: true };
  } catch (e) {
    return { error: msg(e, "Failed to update ship-to address.") };
  }
}

export async function setDefaultShipToAction(id: string) {
  try {
    await requireWrite();
    const target = await db.shipToAddress.findUnique({ where: { id } });
    if (!target) return { error: "Ship-to address not found." };
    await db.$transaction([
      db.shipToAddress.updateMany({ where: { customerId: target.customerId }, data: { isDefault: false } }),
      db.shipToAddress.update({ where: { id }, data: { isDefault: true } }),
    ]);
    revalidateCustomers();
    return { ok: true };
  } catch (e) {
    return { error: msg(e, "Failed to set default address.") };
  }
}

export async function deleteShipToAction(id: string) {
  try {
    await requireWrite();
    await db.shipToAddress.delete({ where: { id } });
    revalidateCustomers();
    return { ok: true };
  } catch (e) {
    return { error: msg(e, "Failed to delete ship-to address.") };
  }
}

function msg(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}
