import { getProduct } from "@/lib/data/products";
import type { OrderStatus } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

/**
 * Order numbers.
 *
 * The id is a uuid, which is unusable out loud or in an email subject. The
 * first eight hex characters are what the customer and support both quote —
 * short enough to read, and with three orders a day it will not collide in the
 * lifetime of the shop. The full uuid stays the key everywhere internal.
 */
export const orderNumber = (id: string) =>
  id.replace(/-/g, "").slice(0, 8).toUpperCase();

export const ORDER_DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const PILL: Record<OrderStatus, string> = {
  created: "text-fg-muted border-line",
  paid: "text-accent-ink border-accent",
  shipped: "text-accent-ink border-accent",
  delivered: "text-fg-muted border-line",
  failed: "text-fg-muted border-line",
  cancelled: "text-fg-muted border-line line-through",
};

const LABEL: Record<OrderStatus, string> = {
  created: "Awaiting payment",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  failed: "Payment failed",
  cancelled: "Cancelled",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "t-label inline-flex shrink-0 items-center rounded-sm border px-2.5 py-1",
        PILL[status],
      )}
    >
      {LABEL[status]}
    </span>
  );
}

/**
 * The line thumbnails, overlapped.
 *
 * Negative margin on every tile after the first, and the stacking order is
 * reversed with z-index so the leftmost sits on top — otherwise each tile is
 * covered by the next and the overlap reads as a mistake.
 */
export function ThumbStack({
  items,
  max = 4,
}: {
  items: { productSlug: string }[];
  max?: number;
}) {
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;

  return (
    <div className="flex shrink-0 items-center">
      {shown.map((item, i) => {
        const product = getProduct(item.productSlug);
        const src = product?.images[0];
        return (
          <div
            key={`${item.productSlug}-${i}`}
            style={{ zIndex: shown.length - i }}
            className={cn(
              "relative h-16 w-[3.25rem] shrink-0 overflow-hidden rounded-sm border border-line bg-bg-raised",
              i > 0 && "-ml-5",
            )}
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                aria-hidden
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="block h-full w-full"
                style={{ backgroundColor: product?.swatch }}
              />
            )}
          </div>
        );
      })}

      {extra > 0 ? (
        <span className="t-label -ml-2 pl-3 text-fg-muted">+{extra}</span>
      ) : null}
    </div>
  );
}
