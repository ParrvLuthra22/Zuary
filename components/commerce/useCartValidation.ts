"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { validateCartAction } from "@/app/actions/cart";
import type { CartValidation, ValidatedLine } from "@/lib/db/queries";
import { useCartStore, type CartItem } from "@/stores/cart";

/**
 * Re-checks the cart on the server whenever it changes, then makes the local
 * cart match what came back.
 *
 * localStorage is a suggestion, not a source of truth. If the server clamps a
 * quantity to available stock or reports a different price, the store is
 * rewritten so what is shown, what is priced and what gets checked out cannot
 * disagree. Calls are debounced so holding the stepper does not fire one
 * request per click.
 */
export function useCartValidation(items: CartItem[], enabled: boolean) {
  const [validation, setValidation] = useState<CartValidation | null>(null);
  const [checking, setChecking] = useState(false);
  // Latched: the correction round-trip clears `changed`, but the shopper still
  // needs telling that their bag moved under them.
  const [corrected, setCorrected] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const seq = useRef(0);

  const run = useCallback(async (payload: CartItem[]) => {
    const ticket = ++seq.current;
    setChecking(true);
    try {
      const result = await validateCartAction(
        payload.map((i) => ({
          slug: i.slug,
          size: i.size,
          qty: i.qty,
          unitPriceInr: i.unitPriceInr,
        })),
      );
      // A slower earlier request must not overwrite a newer answer.
      if (ticket !== seq.current) return;
      setValidation(result);

      const needsFixing = result.lines.filter(
        (l) => l.qty !== l.requestedQty || l.issues.includes("price-changed"),
      );
      if (needsFixing.length > 0) {
        setCorrected(true);
        useCartStore.getState().applyServerTruth(
          result.lines.map((l) => ({
            slug: l.slug,
            size: l.size,
            qty: l.qty,
            unitPriceInr: l.unitPriceInr,
          })),
        );
      }
    } catch {
      if (ticket === seq.current) setValidation(null);
    } finally {
      if (ticket === seq.current) setChecking(false);
    }
  }, []);

  const signature = JSON.stringify(
    items.map((i) => [i.slug, i.size, i.qty, i.unitPriceInr]),
  );

  useEffect(() => {
    if (!enabled) return;
    if (items.length === 0) {
      setValidation(null);
      setCorrected(false);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => run(items), 180);
    return () => clearTimeout(timer.current);
    // signature captures the parts of `items` that matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, signature, run]);

  const lineFor = useCallback(
    (slug: string, size: string): ValidatedLine | undefined =>
      validation?.lines.find((l) => l.slug === slug && l.size === size),
    [validation],
  );

  return { validation, checking, corrected, lineFor };
}
