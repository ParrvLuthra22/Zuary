"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { z } from "zod";

import { NotAdminError, requireAdmin, writeAudit } from "@/lib/admin/guard";
import { CATALOGUE_TAG } from "@/lib/catalogue";
import { db } from "@/lib/db";
import { productImages, products, variants } from "@/lib/db/schema";
import { IMAGES_TAG, productImagesTag } from "@/lib/product-images";

export type AdminResult = { ok: true } | { ok: false; error: string };

function fail(error: unknown): AdminResult {
  if (error instanceof NotAdminError) return { ok: false, error: "Not authorised." };
  console.error("[admin catalogue]", error);
  return { ok: false, error: "That did not work. Try again." };
}

const productSchema = z.object({
  slug: z.string().min(1),
  name: z.string().trim().min(1, "Name is required.").max(60),
  deva: z.string().trim().max(60).optional().or(z.literal("")),
  devaMeaning: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  fabricStory: z.string().trim().max(4000).optional().or(z.literal("")),
  fabric: z.string().trim().max(80).optional().or(z.literal("")),
  weight: z.string().trim().max(40).optional().or(z.literal("")),
  mill: z.string().trim().max(80).optional().or(z.literal("")),
  weave: z.string().trim().max(80).optional().or(z.literal("")),
  shrinkage: z.string().trim().max(80).optional().or(z.literal("")),
  colour: z.string().trim().max(40).optional().or(z.literal("")),
  fit: z.enum(["tailored", "straight", "pleated"]),
  hem: z.enum(["turn-up", "plain"]),
  // A malformed hex silently renders as transparent, which looks like a broken
  // swatch rather than a bad value — so it is rejected here.
  swatch: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Swatch must be a #RRGGBB hex."),
  priceInr: z.coerce.number().int().min(1).max(1_000_000),
  status: z.enum(["available", "coming-soon"]),
  care: z.array(z.string().trim().max(200)).max(12),
});

export async function saveProductAction(
  input: unknown,
): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();

    const parsed = productSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Check the fields.",
      };
    }
    const v = parsed.data;

    const [before] = await db
      .select()
      .from(products)
      .where(eq(products.slug, v.slug))
      .limit(1);
    if (!before) return { ok: false, error: "No such product." };

    await db
      .update(products)
      .set({
        name: v.name,
        priceInr: v.priceInr,
        deva: v.deva || null,
        devaMeaning: v.devaMeaning || null,
        description: v.description || null,
        fabricStory: v.fabricStory || null,
        fabric: v.fabric || null,
        weight: v.weight || null,
        mill: v.mill || null,
        weave: v.weave || null,
        shrinkage: v.shrinkage || null,
        colour: v.colour || null,
        fit: v.fit,
        hem: v.hem,
        swatch: v.swatch,
        status: v.status,
        // Empty rows are the natural result of clearing a care line; drop them
        // rather than rendering blank bullets on the PDP.
        care: v.care.filter(Boolean),
        updatedAt: new Date(),
      })
      .where(eq(products.slug, v.slug));

    await writeAudit({
      actorUserId: admin.id,
      action: "product.update",
      entity: "product",
      entityId: v.slug,
      meta: { before: { name: before.name, priceInr: before.priceInr }, after: { name: v.name, priceInr: v.priceInr } },
    });

    // Tag-scoped so only the catalogue reads are evicted.
    revalidateTag(CATALOGUE_TAG);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/* ── Images ────────────────────────────────────────────────── */

const imageSchema = z.object({
  productSlug: z.string().min(1),
  url: z.string().url().max(1000),
  alt: z.string().trim().max(300),
  blurDataUrl: z.string().max(20_000).nullable().optional(),
});

export async function addBlobImageAction(input: unknown): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const parsed = imageSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Bad image." };
    }
    const v = parsed.data;

    // Append to the end. Reading max+1 rather than counting rows so a gap from
    // a deletion does not collide with an existing sortOrder.
    const [{ next }] = await db
      .select({
        next: sql<number>`coalesce(max(${productImages.sortOrder}), -1) + 1`,
      })
      .from(productImages)
      .where(eq(productImages.productSlug, v.productSlug));

    await db.insert(productImages).values({
      productSlug: v.productSlug,
      url: v.url,
      source: "blob",
      alt: v.alt,
      blurDataUrl: v.blurDataUrl ?? null,
      sortOrder: next,
    });

    await writeAudit({
      actorUserId: admin.id,
      action: "image.upload",
      entity: "product",
      entityId: v.productSlug,
      meta: { url: v.url },
    });

    revalidateTag(IMAGES_TAG);
    revalidateTag(productImagesTag(v.productSlug));
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function updateImageAltAction(
  imageId: string,
  alt: string,
): Promise<AdminResult> {
  try {
    await requireAdmin();
    const [row] = await db
      .update(productImages)
      .set({ alt: alt.trim().slice(0, 300) })
      .where(eq(productImages.id, imageId))
      .returning();
    if (!row) return { ok: false, error: "No such image." };

    revalidateTag(IMAGES_TAG);
    revalidateTag(productImagesTag(row.productSlug));
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Deletes an uploaded image.
 *
 * Refuses on source 'static'. Those rows point at a file committed to git and
 * served from /public — removing the row would not remove the file, and the
 * next run of seed-images would put the row straight back. The honest options
 * for a static image are to reorder it or to delete it from the repository,
 * so the admin offers neither a delete nor a lie about one.
 */
export async function deleteImageAction(imageId: string): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();

    const [row] = await db
      .delete(productImages)
      .where(and(eq(productImages.id, imageId), eq(productImages.source, "blob")))
      .returning();

    if (!row) {
      return {
        ok: false,
        error: "Static images cannot be deleted here — they live in the repo.",
      };
    }

    await writeAudit({
      actorUserId: admin.id,
      action: "image.delete",
      entity: "product",
      entityId: row.productSlug,
      meta: { url: row.url },
    });

    revalidateTag(IMAGES_TAG);
    revalidateTag(productImagesTag(row.productSlug));
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function reorderImagesAction(
  productSlug: string,
  orderedIds: string[],
): Promise<AdminResult> {
  try {
    await requireAdmin();

    // One transaction: a partial reorder leaves duplicate sortOrders and the
    // gallery renders in an order nobody chose.
    await db.transaction(async (tx) => {
      for (const [index, id] of orderedIds.entries()) {
        await tx
          .update(productImages)
          .set({ sortOrder: index })
          .where(
            and(
              eq(productImages.id, id),
              eq(productImages.productSlug, productSlug),
            ),
          );
      }
    });

    revalidateTag(IMAGES_TAG);
    revalidateTag(productImagesTag(productSlug));
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/* ── Stock ─────────────────────────────────────────────────── */

export async function setStockAction(
  variantId: number,
  next: number,
): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();

    const value = Math.max(0, Math.min(9999, Math.floor(next)));

    const [before] = await db
      .select({ stock: variants.stock, sku: variants.sku })
      .from(variants)
      .where(eq(variants.id, variantId))
      .limit(1);
    if (!before) return { ok: false, error: "No such variant." };

    await db
      .update(variants)
      .set({ stock: value })
      .where(eq(variants.id, variantId));

    await writeAudit({
      actorUserId: admin.id,
      action: "stock.update",
      entity: "variant",
      entityId: String(variantId),
      // Before and after, so a mis-keyed number can be traced and undone.
      meta: { sku: before.sku, before: before.stock, after: value },
    });

    // Stock drives the PDP size selector, so the catalogue reads must refresh.
    revalidateTag(CATALOGUE_TAG);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
