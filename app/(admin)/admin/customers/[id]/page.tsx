import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getCustomerForAdmin,
  listOrdersForCustomer,
} from "@/server/db/queries";
import { shortOrderId } from "@/shared/utils/order-number";
import { formatINR } from "@/shared/utils";
import { requireAdminPage } from "@/server/auth/guards";

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function AdminCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Authorisation before any query — see requireAdminPage.
  await requireAdminPage();

  const { id } = await params;

  const customer = await getCustomerForAdmin(id).catch(() => undefined);
  if (!customer) notFound();

  const orders = await listOrdersForCustomer(id).catch(() => []);

  return (
    <div className="max-w-4xl">
      <Link
        href="/admin/customers"
        className="font-mono text-[11px] tracking-wide text-fg-muted uppercase hover:text-fg"
      >
        ← Customers
      </Link>

      <h1 className="mt-3 font-mono text-lg text-fg">
        {customer.name ?? customer.email}
      </h1>
      <p className="mt-1 font-mono text-[11px] text-fg-muted">
        {customer.email}
        {customer.phone ? ` · ${customer.phone}` : ""} · joined{" "}
        {DATE.format(new Date(customer.createdAt))}
        {customer.earlyAccess ? " · early access" : ""}
      </p>

      <h2 className="mt-8 font-mono text-[10px] tracking-[0.15em] text-fg-muted uppercase">
        Orders
      </h2>

      {orders.length === 0 ? (
        <p className="mt-3 font-mono text-xs text-fg-muted">No orders.</p>
      ) : (
        <table className="mt-3 w-full border-collapse text-left">
          <thead>
            <tr className="border-y border-line">
              {["Order", "Date", "Status", "Total"].map((h) => (
                <th
                  key={h}
                  className="px-2 py-2 font-mono text-[10px] font-normal tracking-[0.15em] text-fg-muted uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-line/60">
                <td className="px-2 py-2">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-mono text-xs text-fg hover:text-accent-ink"
                  >
                    {shortOrderId(order.id)}
                  </Link>
                </td>
                <td className="px-2 py-2 font-mono text-[11px] text-fg-muted">
                  {DATE.format(new Date(order.createdAt))}
                </td>
                <td className="px-2 py-2 font-mono text-[11px] text-fg-muted">
                  {order.status}
                </td>
                <td className="px-2 py-2 font-mono text-xs">
                  {formatINR(order.totalInr)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
