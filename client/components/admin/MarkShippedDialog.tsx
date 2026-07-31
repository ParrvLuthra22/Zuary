"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { markShippedAction } from "@/server/actions/orders.actions";
import { COURIERS, trackingUrlFor } from "@/shared/constants/couriers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";

const INPUT =
  "h-9 w-full rounded border border-line bg-bg px-2.5 font-mono text-xs text-fg outline-none focus:border-accent";

export function MarkShippedDialog({
  orderId,
  orderNumber,
  open,
  onOpenChange,
}: {
  orderId: string;
  orderNumber: string;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const [courier, setCourier] = useState<string>(COURIERS[0].value);
  const [awb, setAwb] = useState("");
  /**
   * Held separately from the derived value so a URL the admin typed for "Other"
   * is not wiped the moment they touch the AWB field again.
   */
  const [manualUrl, setManualUrl] = useState("");
  const [pending, startTransition] = useTransition();

  const derived = trackingUrlFor(courier, awb);
  const hasTemplate = Boolean(
    COURIERS.find((c) => c.value === courier)?.template,
  );
  const shownUrl = derived ?? manualUrl;

  function submit() {
    if (awb.trim().length < 3) {
      toast("AWB is required.");
      return;
    }
    startTransition(async () => {
      const result = await markShippedAction({
        orderId,
        courier,
        awb: awb.trim(),
        trackingUrl: hasTemplate ? undefined : manualUrl.trim() || undefined,
      });
      if (result.ok) {
        toast(`${orderNumber} marked shipped.`);
        onOpenChange(false);
        setAwb("");
        setManualUrl("");
        return;
      }
      toast(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-line bg-bg-deep sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm tracking-wide uppercase">
            Mark shipped
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-fg-muted">
            Order {orderNumber}. This emails the customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="ship-courier"
              className="mb-1.5 block font-mono text-[11px] tracking-wide text-fg-muted uppercase"
            >
              Courier
            </label>
            <select
              id="ship-courier"
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
              className={INPUT}
            >
              {COURIERS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="ship-awb"
              className="mb-1.5 block font-mono text-[11px] tracking-wide text-fg-muted uppercase"
            >
              AWB <span className="text-accent-ink">*</span>
            </label>
            <input
              id="ship-awb"
              value={awb}
              onChange={(e) => setAwb(e.target.value)}
              autoComplete="off"
              // The number is usually scanned or pasted; select-all on focus
              // makes a re-scan overwrite rather than append.
              onFocus={(e) => e.currentTarget.select()}
              className={INPUT}
            />
          </div>

          <div>
            <label
              htmlFor="ship-url"
              className="mb-1.5 block font-mono text-[11px] tracking-wide text-fg-muted uppercase"
            >
              Tracking URL{" "}
              <span className="normal-case">
                {hasTemplate ? "(auto)" : "(optional)"}
              </span>
            </label>
            <input
              id="ship-url"
              value={shownUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              // Auto-filled couriers own this field; only "Other" is editable.
              readOnly={hasTemplate}
              placeholder={hasTemplate ? "" : "https://…"}
              className={`${INPUT} ${hasTemplate ? "text-fg-muted" : ""}`}
            />
            {!hasTemplate ? (
              <p className="mt-1.5 font-mono text-[11px] text-fg-muted">
                Leave blank and the email shows the AWB as plain text.
              </p>
            ) : null}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="h-9 flex-1 rounded bg-accent px-4 font-mono text-xs tracking-wide text-carbon uppercase disabled:opacity-50"
            >
              {pending ? "Saving…" : "Mark shipped"}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 rounded border border-line px-4 font-mono text-xs tracking-wide text-fg-muted uppercase hover:text-fg"
            >
              Cancel
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
