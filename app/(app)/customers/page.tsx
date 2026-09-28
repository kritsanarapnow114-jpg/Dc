import { getCustomers } from "@/lib/views/customers";
import { CustomersManager } from "./CustomersManager";

export default async function CustomersPage() {
  const customers = await getCustomers();
  return (
    <div className="max-w-[1100px] p-[22px_26px]">
      <CustomersManager customers={customers} />
    </div>
  );
}
