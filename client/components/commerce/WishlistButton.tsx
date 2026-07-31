"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { toggleWishlistAction } from "@/server/actions/wishlist.actions";
import { cn } from "@/shared/utils";

/**
 * The heart.
 *
 * Signed out, it does not attempt the toggle — it routes to /login carrying the
 * current path, so signing in returns the customer to the product they were
 * looking at rather than to /account.
 *
 * Signed in, useOptimistic fills the heart on click and the server action
 * follows. If the action fails the optimistic value is discarded automatically
 * when the transition ends, so the heart falls back to the truth on its own.
 */
export function WishlistButton({
  slug,
  saved,
  signedIn,
  className,
  label = true,
}: {
  slug: string;
  saved: boolean;
  signedIn: boolean;
  className?: string;
  /** Product cards want icon only; the PDP wants text beside it. */
  label?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(saved);

  function onClick(event: React.MouseEvent) {
    // The heart sits inside a stretched card link on the shop grid.
    event.preventDefault();
    event.stopPropagation();

    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    startTransition(async () => {
      setOptimistic(!optimistic);
      const result = await toggleWishlistAction(slug);

      if (!result.ok) {
        if (result.reason === "unauthenticated") {
          router.push(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        toast("Could not update your wishlist.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={optimistic}
      aria-label={
        optimistic ? `Remove ${slug} from wishlist` : `Save ${slug} to wishlist`
      }
      className={cn(
        "inline-flex items-center gap-2 transition-colors duration-[--dur-micro]",
        optimistic ? "text-accent-ink" : "text-fg-muted hover:text-fg",
        className,
      )}
    >
      <Heart
        className="size-4"
        // Outline by default, filled in accent once saved.
        fill={optimistic ? "currentColor" : "none"}
      />
      {label ? (
        <span className="t-label">{optimistic ? "Saved" : "Save"}</span>
      ) : null}
    </button>
  );
}
