import "server-only";

import {
  listWishlistSlugs,
  toggleWishlist as flip,
} from "@/server/db/queries";

/**
 * The wishlist. Thin, because there is genuinely one rule here — the toggle is
 * a single scoped statement — but it goes through a service anyway so the
 * action stays a wrapper and a future mobile endpoint has the same door.
 */

export function getWishlist(userId: string) {
  return listWishlistSlugs(userId);
}

export function toggleWishlist(userId: string, productSlug: string) {
  return flip(userId, productSlug);
}
