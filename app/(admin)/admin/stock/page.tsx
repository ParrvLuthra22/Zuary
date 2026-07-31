import { StockGrid } from "@/client/components/admin/StockGrid";
import { requireAdminPage } from "@/server/auth/guards";
import { listStockGrid } from "@/server/db/queries";

export default async function AdminStockPage() {
  // Authorisation before any query — see requireAdminPage.
  await requireAdminPage();

  let cells;
  try {
    cells = await listStockGrid();
  } catch (error) {
    console.error("[admin/stock]", error);
    return (
      <div className="py-16">
        <p className="font-mono text-sm text-fg">Could not load stock.</p>
        <p className="mt-2 font-mono text-xs text-fg-muted">
          The database is unreachable. Nothing has been changed.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-4 font-mono text-sm tracking-wide text-fg uppercase">
        Stock
      </h1>
      {cells.length === 0 ? (
        <p className="py-16 text-center font-mono text-xs text-fg-muted">
          No variants. Run <code>npm run db:seed</code>.
        </p>
      ) : (
        <StockGrid cells={cells} />
      )}
    </>
  );
}
