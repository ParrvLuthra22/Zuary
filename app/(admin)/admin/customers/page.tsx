import { CustomersTable } from "@/components/admin/CustomersTable";
import { listCustomersForAdmin, type CustomerSort } from "@/lib/db/admin-queries";
import { requireAdminPage } from "@/lib/admin/guard";

const VALID: CustomerSort[] = ["spent", "orders", "joined"];

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  // Authorisation before any query — see requireAdminPage.
  await requireAdminPage();

  const sp = await searchParams;
  const sort = VALID.includes(sp.sort as CustomerSort)
    ? (sp.sort as CustomerSort)
    : "spent";

  let rows;
  try {
    rows = await listCustomersForAdmin(sort);
  } catch (error) {
    console.error("[admin/customers]", error);
    return (
      <div className="py-16">
        <p className="font-mono text-sm text-fg">Could not load customers.</p>
        <p className="mt-2 font-mono text-xs text-fg-muted">
          The database is unreachable.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-4 font-mono text-sm tracking-wide text-fg uppercase">
        Customers
      </h1>
      <CustomersTable rows={rows} sort={sort} />
    </>
  );
}
