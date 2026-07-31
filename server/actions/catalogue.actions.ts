"use server";

import "server-only";

import { revalidateTag } from "next/cache";

import { requireAdmin } from "@/server/auth/guards";
import { parseInput } from "@/server/http";
import { setStock } from "@/server/services/inventory.service";
import {
  CATALOGUE_TAG,
  IMAGES_TAG,
  addProductImage,
  deleteProductImage,
  productImagesTag,
  reorderProductImages,
  updateImageAlt,
  updateProduct,
} from "@/server/services/products.service";
import {
  addImageSchema,
  imageAltSchema,
  productSchema,
  reorderImagesSchema,
  setStockSchema,
} from "@/server/validators/admin.validator";
import { fail, ok, type ActionResult } from "./result";

/**
 * Admin catalogue actions.
 *
 * Cache invalidation is the one thing that stays here rather than moving into
 * the service: revalidateTag is a Next API, and a service that called it could
 * not be reused by anything outside a Next request. The services export the tag
 * names instead, so the knowledge of what a write affects still lives with the
 * write.
 */

export type AdminResult = ActionResult;

export async function saveProductAction(input: unknown): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const { slug, ...data } = parseInput(productSchema, input);

    await updateProduct({ slug, data, actorUserId: admin.id });

    // Tag-scoped so only the catalogue reads are evicted.
    revalidateTag(CATALOGUE_TAG);
    return ok();
  } catch (error) {
    return fail(error, "admin/saveProduct");
  }
}

export async function addBlobImageAction(input: unknown): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const v = parseInput(addImageSchema, input);

    await addProductImage({ ...v, actorUserId: admin.id });

    revalidateTag(IMAGES_TAG);
    revalidateTag(productImagesTag(v.productSlug));
    return ok();
  } catch (error) {
    return fail(error, "admin/addBlobImage");
  }
}

export async function updateImageAltAction(
  imageId: string,
  alt: string,
): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const v = parseInput(imageAltSchema, { imageId, alt });

    const row = await updateImageAlt({ ...v, actorUserId: admin.id });

    revalidateTag(IMAGES_TAG);
    revalidateTag(productImagesTag(row.productSlug));
    return ok();
  } catch (error) {
    return fail(error, "admin/updateImageAlt");
  }
}

export async function deleteImageAction(imageId: string): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();

    const row = await deleteProductImage({ imageId, actorUserId: admin.id });

    revalidateTag(IMAGES_TAG);
    revalidateTag(productImagesTag(row.productSlug));
    return ok();
  } catch (error) {
    return fail(error, "admin/deleteImage");
  }
}

export async function reorderImagesAction(
  productSlug: string,
  orderedIds: string[],
): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const v = parseInput(reorderImagesSchema, { productSlug, orderedIds });

    await reorderProductImages({ ...v, actorUserId: admin.id });

    revalidateTag(IMAGES_TAG);
    revalidateTag(productImagesTag(v.productSlug));
    return ok();
  } catch (error) {
    return fail(error, "admin/reorderImages");
  }
}

export async function setStockAction(
  variantId: number,
  next: number,
): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const v = parseInput(setStockSchema, { variantId, qty: next });

    await setStock({ ...v, actorUserId: admin.id });

    // Stock drives the PDP size selector, so the catalogue reads must refresh.
    revalidateTag(CATALOGUE_TAG);
    return ok();
  } catch (error) {
    return fail(error, "admin/setStock");
  }
}
