"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { PRODUCTS } from "@/lib/data/products";
import { toggleWishlist } from "@/lib/db/queries";

const SLUGS = new Set(PRODUCTS.map((p) => p.slug));

export type ToggleResult =
  | { ok: true; saved: boolean }
  | { ok: false; reason: "unauthenticated" | "error" };

/**
 * Flips one product in the signed-in customer's wishlist.
 *
 * Returns `unauthenticated` rather than redirecting: the caller is a button
 * inside a product card, and it knows the path it wants to come back to. A
 * redirect from here would send people to /login with no `next`.
 *
 * The slug is checked against the catalogue before it reaches the database —
 * the wishlist table stores a slug rather than a foreign key, so without this
 * anyone could POST arbitrary strings into their own rows.
 */
export async function toggleWishlistAction(
  productSlug: string,
): Promise<ToggleResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, reason: "unauthenticated" };

  if (!SLUGS.has(productSlug as never)) {
    return { ok: false, reason: "error" };
  }

  try {
    const { saved } = await toggleWishlist(userId, productSlug);
    revalidatePath("/account/wishlist");
    return { ok: true, saved };
  } catch (error) {
    console.error("[wishlist]", error);
    return { ok: false, reason: "error" };
  }
}
