"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/server/auth/guards";
import { parseInput } from "@/server/http";
import { toggleWishlist } from "@/server/services/wishlist.service";
import { PRODUCTS } from "@/shared/constants/products";
import { fail, ok, type ActionResult } from "./result";

// Checked against the real catalogue before it reaches the database: the
// wishlist table stores a slug rather than a foreign key, so without this
// anyone could POST arbitrary strings into their own rows.
const slugSchema = z.enum(PRODUCTS.map((p) => p.slug) as [string, ...string[]]);

export type ToggleResult = ActionResult<{ saved: boolean }>;

/**
 * Flips one product in the signed-in customer's wishlist.
 *
 * Returns a failed result rather than redirecting when signed out: the caller
 * is a button inside a product card and it knows the path it wants to come back
 * to. A redirect from here would send people to /login with no `next`. The
 * client branches on `code === "UNAUTHORIZED"`.
 */
export async function toggleWishlistAction(
  productSlug: string,
): Promise<ToggleResult> {
  try {
    const user = await requireUser();
    const slug = parseInput(slugSchema, productSlug);

    const { saved } = await toggleWishlist(user.id, slug);

    revalidatePath("/account/wishlist");
    return ok({ saved });
  } catch (error) {
    return fail(error, "wishlist/toggle");
  }
}
