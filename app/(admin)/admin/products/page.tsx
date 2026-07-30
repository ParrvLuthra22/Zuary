import Link from "next/link";

import { requireAdminPage } from "@/lib/admin/guard";
import { listProductsForAdmin } from "@/lib/db/admin-queries";
import { formatINR } from "@/lib/utils";

export default async function AdminProductsPage() {
  // Authorisation before any query — see requireAdminPage.
  await requireAdminPage();

  let rows;
  try {
    rows = await listProductsForAdmin();
  } catch (error) {
    console.error("[admin/products]", error);
    return (
      <div className="py-16">
        <p className="font-mono text-sm text-fg">Could not load products.</p>
        <p className="mt-2 font-mono text-xs text-fg-muted">
          The database is unreachable.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-4 font-mono text-sm tracking-wide text-fg uppercase">
        Products
      </h1>

      {rows.length === 0 ? (
        <p className="py-16 text-center font-mono text-xs text-fg-muted">
          No products in the database. Run <code>npm run db:seed</code>.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-y border-line">
                {["", "Name", "Slug", "Price", "Status", "Images", "Stock"].map(
                  (h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-2 py-2 font-mono text-[10px] font-normal tracking-[0.15em] text-fg-muted uppercase"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-line/60 hover:bg-bg-raised/40"
                >
                  <td className="px-2 py-2">
                    <span
                      aria-hidden
                      className="block size-8 rounded border border-line"
                      style={{ backgroundColor: row.swatch ?? "#262626" }}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Link
                      href={`/admin/products/${row.slug}`}
                      className="font-mono text-xs text-fg hover:text-accent-ink"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-2 py-2 font-mono text-[11px] text-fg-muted">
                    {row.slug}
                  </td>
                  <td className="px-2 py-2 font-mono text-xs whitespace-nowrap">
                    {formatINR(row.priceInr)}
                  </td>
                  <td className="px-2 py-2 font-mono text-[11px] text-fg-muted">
                    {row.status ?? "—"}
                  </td>
                  <td className="px-2 py-2 font-mono text-xs text-fg-muted">
                    {row.imageCount}
                  </td>
                  <td
                    className={
                      row.totalStock === 0
                        ? "px-2 py-2 font-mono text-xs text-accent-ink"
                        : "px-2 py-2 font-mono text-xs text-fg-muted"
                    }
                  >
                    {row.totalStock}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
