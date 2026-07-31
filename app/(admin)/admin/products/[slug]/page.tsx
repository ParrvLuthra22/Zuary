import Link from "next/link";
import { notFound } from "next/navigation";

import { ImageManager } from "@/client/components/admin/ImageManager";
import { ProductForm } from "@/client/components/admin/ProductForm";
import { requireAdminPage } from "@/server/auth/guard";
import { getProductRow } from "@/server/db/queries/catalogue";
import { listImagesForAdmin } from "@/server/db/queries";

export default async function AdminProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Authorisation before any query — see requireAdminPage.
  await requireAdminPage();

  const { slug } = await params;

  const row = await getProductRow(slug).catch(() => undefined);
  if (!row) notFound();

  const images = await listImagesForAdmin(slug).catch(() => []);

  return (
    <div>
      <Link
        href="/admin/products"
        className="font-mono text-[11px] tracking-wide text-fg-muted uppercase hover:text-fg"
      >
        ← Products
      </Link>

      <h1 className="mt-3 font-mono text-lg text-fg">{row.name}</h1>
      <p className="mt-1 font-mono text-[11px] text-fg-muted">{row.slug}</p>

      <div className="mt-8">
        <ProductForm row={row} />
      </div>

      <div className="mt-12 border-t border-line pt-8">
        <ImageManager
          productSlug={slug}
          initial={images.map((i) => ({
            id: i.id,
            url: i.url,
            alt: i.alt,
            source: i.source,
            sortOrder: i.sortOrder,
          }))}
        />
      </div>
    </div>
  );
}
