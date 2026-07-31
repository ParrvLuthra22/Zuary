import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { getCatalogue, getCatalogueProduct } from "@/server/db/queries/catalogue";
import {
  getProductImages as readProductImages,
} from "@/server/db/queries/product-images";
import { listProductsForAdmin, listImagesForAdmin } from "@/server/db/queries";
import { productImages, products } from "@/server/db/schema";
import { NotFoundError, ValidationError } from "@/shared/errors";
import { auditLog } from "./admin.service";

/**
 * Catalogue reads and admin catalogue writes.
 *
 * The reads delegate to the cached query layer; the writes own the invariants.
 * Cache invalidation is deliberately NOT done here — revalidateTag is a Next
 * API and this file has to stay framework-agnostic, so services export the tag
 * names they affect and the calling route or action does the revalidating.
 */

export {
  CATALOGUE_TAG,
  productTag,
} from "@/server/db/queries/catalogue";
export {
  IMAGES_TAG,
  productImagesTag,
} from "@/server/db/queries/product-images";

/* ── Reads ─────────────────────────────────────────────────── */

export async function listProducts(params: { status?: "all" | "active" } = {}) {
  const catalogue = await getCatalogue();
  if (params.status === "all") return catalogue;
  return catalogue.filter((p) => p.status === "available");
}

export async function getProduct(slug: string) {
  const product = await getCatalogueProduct(slug);
  if (!product) throw new NotFoundError("No such product.");
  return product;
}

export function getProductImages(slug: string) {
  return readProductImages(slug);
}

/** Admin grid: product rows with image counts and total stock. */
export function listForAdmin() {
  return listProductsForAdmin();
}

/** Admin image manager: every row, static and uploaded alike. */
export function listImagesForAdminBySlug(slug: string) {
  return listImagesForAdmin(slug);
}

/* ── Product writes ────────────────────────────────────────── */

export type ProductUpdate = {
  name: string;
  deva?: string | null;
  devaMeaning?: string | null;
  description?: string | null;
  fabricStory?: string | null;
  fabric?: string | null;
  weight?: string | null;
  mill?: string | null;
  weave?: string | null;
  shrinkage?: string | null;
  colour?: string | null;
  fit: "tailored" | "straight" | "pleated";
  hem: "turn-up" | "plain";
  swatch: string;
  priceInr: number;
  status: "available" | "coming-soon";
  care: string[];
};

/** Empty string means "cleared" in a form; the column wants null. */
const orNull = (value: string | null | undefined) => value?.trim() || null;

export async function updateProduct(input: {
  slug: string;
  data: ProductUpdate;
  actorUserId: string;
}) {
  const { slug, data } = input;

  return db.transaction(async (tx) => {
    const [before] = await tx
      .select({ name: products.name, priceInr: products.priceInr })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (!before) throw new NotFoundError("No such product.");

    const [row] = await tx
      .update(products)
      .set({
        name: data.name,
        priceInr: data.priceInr,
        deva: orNull(data.deva),
        devaMeaning: orNull(data.devaMeaning),
        description: orNull(data.description),
        fabricStory: orNull(data.fabricStory),
        fabric: orNull(data.fabric),
        weight: orNull(data.weight),
        mill: orNull(data.mill),
        weave: orNull(data.weave),
        shrinkage: orNull(data.shrinkage),
        colour: orNull(data.colour),
        fit: data.fit,
        hem: data.hem,
        swatch: data.swatch,
        status: data.status,
        // Blank rows are the natural result of clearing a care line; drop them
        // rather than rendering empty bullets on the product page.
        care: data.care.filter(Boolean),
        updatedAt: new Date(),
      })
      .where(eq(products.slug, slug))
      .returning();

    await auditLog(
      {
        actorUserId: input.actorUserId,
        action: "product.update",
        entity: "product",
        entityId: slug,
        meta: {
          before: { name: before.name, priceInr: before.priceInr },
          after: { name: data.name, priceInr: data.priceInr },
        },
      },
      tx,
    );

    return row;
  });
}

/* ── Image writes ──────────────────────────────────────────── */

export async function addProductImage(input: {
  productSlug: string;
  url: string;
  alt: string;
  blurDataUrl?: string | null;
  actorUserId: string;
}) {
  return db.transaction(async (tx) => {
    /*
     * Append to the end, using max(sortOrder)+1 rather than a row count.
     * Counting breaks after a deletion — five rows numbered 0,1,2,4,5 give a
     * count of 5, which collides with an image already sitting at 5 and the
     * gallery renders two images in the same slot.
     */
    const [{ next }] = await tx
      .select({
        next: sql<number>`coalesce(max(${productImages.sortOrder}), -1) + 1`,
      })
      .from(productImages)
      .where(eq(productImages.productSlug, input.productSlug));

    const [row] = await tx
      .insert(productImages)
      .values({
        productSlug: input.productSlug,
        url: input.url,
        source: "blob",
        alt: input.alt,
        blurDataUrl: input.blurDataUrl ?? null,
        sortOrder: next,
      })
      .returning();

    await auditLog(
      {
        actorUserId: input.actorUserId,
        action: "image.upload",
        entity: "product",
        entityId: input.productSlug,
        meta: { url: input.url },
      },
      tx,
    );

    return row;
  });
}

export async function updateImageAlt(input: {
  imageId: string;
  alt: string;
  actorUserId: string;
}) {
  const [row] = await db
    .update(productImages)
    .set({ alt: input.alt.trim().slice(0, 300) })
    .where(eq(productImages.id, input.imageId))
    .returning();

  if (!row) throw new NotFoundError("No such image.");
  return row;
}

/**
 * Deletes an uploaded image.
 *
 * Scoped to `source = 'blob'` in the WHERE clause. A 'static' row points at a
 * file committed to git and served from /public — deleting the row would not
 * delete the file, and the next run of seed-images would put the row straight
 * back. Refusing is the honest answer; the alternative is a button that appears
 * to work and silently does not.
 */
export async function deleteProductImage(input: {
  imageId: string;
  actorUserId: string;
}) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .delete(productImages)
      .where(
        and(
          eq(productImages.id, input.imageId),
          eq(productImages.source, "blob"),
        ),
      )
      .returning();

    if (!row) {
      throw new ValidationError(
        "Static images cannot be deleted here — they live in the repo.",
      );
    }

    await auditLog(
      {
        actorUserId: input.actorUserId,
        action: "image.delete",
        entity: "product",
        entityId: row.productSlug,
        meta: { url: row.url },
      },
      tx,
    );

    return row;
  });
}

/**
 * Rewrites the gallery order.
 *
 * One transaction, because a partial reorder leaves duplicate sortOrders and
 * the gallery renders in an order nobody chose. Every UPDATE is scoped to the
 * slug as well as the id, so a caller cannot reorder another product's images
 * by passing ids that do not belong to it.
 */
export async function reorderProductImages(input: {
  productSlug: string;
  orderedIds: string[];
  actorUserId: string;
}) {
  return db.transaction(async (tx) => {
    for (const [index, id] of input.orderedIds.entries()) {
      await tx
        .update(productImages)
        .set({ sortOrder: index })
        .where(
          and(
            eq(productImages.id, id),
            eq(productImages.productSlug, input.productSlug),
          ),
        );
    }

    await auditLog(
      {
        actorUserId: input.actorUserId,
        action: "image.reorder",
        entity: "product",
        entityId: input.productSlug,
        meta: { count: input.orderedIds.length },
      },
      tx,
    );
  });
}
