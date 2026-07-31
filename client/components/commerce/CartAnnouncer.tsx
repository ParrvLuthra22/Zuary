"use client";

import { useEffect, useRef, useState } from "react";

import { cartCount, useCartStore } from "@/client/stores/cart";

/**
 * Announces bag changes to screen readers. The cart sheet opening is a visual
 * cue only; without this, adding an item is silent for anyone not looking.
 */
export function CartAnnouncer() {
  const items = useCartStore((s) => s.items);
  const count = cartCount(items);
  const previous = useRef<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Skip the first run so hydrating a saved cart does not announce itself.
    if (previous.current === null) {
      previous.current = count;
      return;
    }
    if (count === previous.current) return;

    const delta = count - previous.current;
    previous.current = count;

    setMessage(
      delta > 0
        ? `Added to bag. ${count} item${count === 1 ? "" : "s"} in your bag.`
        : `Removed from bag. ${count} item${count === 1 ? "" : "s"} in your bag.`,
    );
  }, [count]);

  return (
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </p>
  );
}
