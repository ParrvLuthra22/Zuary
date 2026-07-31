"use client";

import { Check, Copy } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { cancelOrderAction, markDeliveredAction } from "@/server/actions/orders.actions";
import { MarkShippedDialog } from "@/client/components/admin/MarkShippedDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import type { OrderStatus } from "@/server/db/schema";

/**
 * Copies the shipping address as a plain block.
 *
 * Courier systems take a pasted address, not a formatted one — so this emits
 * newline-separated plain text with the phone on its own line, which is what
 * their forms expect. Falls back to a textarea + execCommand because
 * navigator.clipboard is unavailable over plain http on anything but localhost,
 * and admin may well be opened over a LAN address.
 */
export function CopyAddressButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
      }
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      toast("Could not copy. Select the text instead.");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded border border-line px-2 py-1 font-mono text-[11px] tracking-wide text-fg-muted uppercase hover:border-accent hover:text-accent-ink"
    >
      {done ? <Check className="size-3" /> : <Copy className="size-3" />}
      {done ? "Copied" : "Copy address"}
    </button>
  );
}

export function OrderActions({
  orderId,
  orderNumber,
  status,
}: {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
}) {
  const [shipOpen, setShipOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();

  const canCancel = status !== "cancelled";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "paid" ? (
        <button
          type="button"
          onClick={() => setShipOpen(true)}
          className="rounded border border-line px-2.5 py-1.5 font-mono text-[11px] tracking-wide text-fg uppercase hover:border-accent hover:text-accent-ink"
        >
          Mark shipped
        </button>
      ) : null}

      {status === "shipped" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await markDeliveredAction(orderId);
              toast(r.ok ? "Marked delivered." : r.error);
            })
          }
          className="rounded border border-line px-2.5 py-1.5 font-mono text-[11px] tracking-wide text-fg uppercase hover:border-accent hover:text-accent-ink disabled:opacity-50"
        >
          Mark delivered
        </button>
      ) : null}

      {canCancel ? (
        <button
          type="button"
          onClick={() => {
            setTyped("");
            setCancelOpen(true);
          }}
          className="ml-auto rounded border border-line px-2.5 py-1.5 font-mono text-[11px] tracking-wide text-fg-muted uppercase hover:border-accent-deep hover:text-accent-ink"
        >
          Cancel order
        </button>
      ) : null}

      <MarkShippedDialog
        orderId={orderId}
        orderNumber={orderNumber}
        open={shipOpen}
        onOpenChange={setShipOpen}
      />

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="border-line bg-bg-deep sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm tracking-wide uppercase">
              Cancel {orderNumber}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs leading-relaxed text-fg-muted">
              This emails the customer that their order is cancelled and starts
              a refund conversation. Stock is not returned automatically — put
              it back by hand if the parcel never left.
            </DialogDescription>
          </DialogHeader>

          <label
            htmlFor="cancel-confirm"
            className="block font-mono text-[11px] tracking-wide text-fg-muted uppercase"
          >
            Type {orderNumber} to confirm
          </label>
          <input
            id="cancel-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="h-9 w-full rounded border border-line bg-bg px-2.5 font-mono text-xs tracking-widest text-fg uppercase outline-none focus:border-accent"
          />

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              // Client-side gate is convenience only — the action re-checks the
              // typed number server-side.
              disabled={pending || typed.trim().toUpperCase() !== orderNumber}
              onClick={() =>
                startTransition(async () => {
                  const r = await cancelOrderAction(orderId, typed);
                  if (r.ok) {
                    toast(`${orderNumber} cancelled.`);
                    setCancelOpen(false);
                  } else {
                    toast(r.error);
                  }
                })
              }
              className="h-9 flex-1 rounded bg-accent-deep px-4 font-mono text-xs tracking-wide text-off-white uppercase disabled:opacity-40"
            >
              {pending ? "Cancelling…" : "Cancel order"}
            </button>
            <button
              type="button"
              onClick={() => setCancelOpen(false)}
              className="h-9 rounded border border-line px-4 font-mono text-xs tracking-wide text-fg-muted uppercase hover:text-fg"
            >
              Keep it
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
