import { OrdersTable } from "@/client/components/admin/OrdersTable";
import { listOrdersForAdmin, type OrderFilter } from "@/server/db/queries";
import { requireAdminPage } from "@/server/auth/guard";

const VALID: OrderFilter[] = [
  "all",
  "unshipped",
  "shipped",
  "delivered",
  "failed",
  "cancelled",
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; page?: string }>;
}) {
  // Authorisation before any query — see requireAdminPage.
  await requireAdminPage();

  const sp = await searchParams;

  /* Default is the working queue, not "all" — this page opens on the packing
     table every morning and the first thing anyone wants is what still has to
     go out. */
  const filter = VALID.includes(sp.filter as OrderFilter)
    ? (sp.filter as OrderFilter)
    : "unshipped";
  const search = sp.q ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  let data;
  try {
    data = await listOrdersForAdmin({ filter, search, page });
  } catch (error) {
    console.error("[admin/orders]", error);
    return (
      <div className="py-16">
        <p className="font-mono text-sm text-fg">Could not load orders.</p>
        <p className="mt-2 font-mono text-xs text-fg-muted">
          The database is unreachable. Nothing has been changed.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-4 font-mono text-sm tracking-wide text-fg uppercase">
        Orders
      </h1>
      <OrdersTable
        rows={data.rows}
        filter={filter}
        search={search}
        page={data.page}
        pages={data.pages}
        total={data.total}
      />
    </>
  );
}
