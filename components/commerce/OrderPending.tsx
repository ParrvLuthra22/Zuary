"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const POLL_MS = 3000;
const GIVE_UP_MS = 30000;

/**
 * The webhook and the redirect race each other. If the shopper's tab wins,
 * the order is still 'created' when this page renders, so poll until the
 * webhook settles it — then reload to show the real confirmation.
 */
export function OrderPending({ orderId }: { orderId: string }) {
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let stopped = false;
    const started = Date.now();

    const tick = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (data.status === "paid") {
          window.location.reload();
          return;
        }
      } catch {
        // Keep polling; a blip should not end the wait.
      }
      if (Date.now() - started >= GIVE_UP_MS) {
        setGaveUp(true);
        return;
      }
      timer = setTimeout(tick, POLL_MS);
    };

    let timer = setTimeout(tick, POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [orderId]);

  return (
    <div className="flex flex-col items-center gap-5 py-24 text-center">
      {gaveUp ? (
        <>
          <p className="t-display-sm">Still confirming.</p>
          <p className="max-w-md text-sm text-fg-muted">
            Your payment went through but the confirmation has not reached us
            yet. Nothing is lost — we will email you as soon as it lands. Quote
            order {orderId.slice(0, 8).toUpperCase()} if you get in touch.
          </p>
        </>
      ) : (
        <>
          <Loader2 className="size-6 animate-spin text-accent-ink" />
          <p className="t-display-sm">Confirming your payment.</p>
          <p className="t-label text-fg-muted">This takes a few seconds.</p>
        </>
      )}
    </div>
  );
}
