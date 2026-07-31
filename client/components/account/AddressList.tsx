"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteAddressAction,
  setDefaultAddressAction,
} from "@/server/actions/addresses.actions";
import { AddressSheet } from "@/client/components/account/AddressSheet";
import { TriangleA } from "@/client/components/layout/Wordmark";
import { ButtonZ } from "@/client/components/ui/button-z";
import type { Address } from "@/server/db/schema";
import { cn } from "@/shared/utils";

export function AddressList({ addresses }: { addresses: Address[] }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(id: string, action: () => Promise<{ ok: boolean; error?: string }>) {
    setPendingId(id);
    startTransition(async () => {
      const result = await action();
      setPendingId(null);
      if (!result.ok) toast(result.error ?? "That did not work.");
    });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h2 className="t-label text-fg-muted">
          {addresses.length}{" "}
          {addresses.length === 1 ? "address" : "addresses"}
        </h2>
        <ButtonZ
          onClick={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
        >
          <Plus className="size-3.5" />
          Add address
        </ButtonZ>
      </div>

      {addresses.length === 0 ? (
        <div className="mt-10 flex flex-col items-start gap-5 border-t border-line py-16">
          <TriangleA className="text-4xl" />
          <p className="t-display-sm">No addresses saved.</p>
          <p className="max-w-sm text-sm text-fg-muted">
            Save one and checkout gets shorter next time.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => {
            const busy = pendingId === address.id;
            return (
              <li
                key={address.id}
                className={cn(
                  "flex flex-col rounded-sm border p-5 transition-opacity",
                  address.isDefault ? "border-accent/40" : "border-line",
                  busy && "opacity-50",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="t-label text-fg-muted">
                    {address.label || "Address"}
                  </p>
                  {address.isDefault ? (
                    <span className="t-label rounded-sm border border-accent px-2 py-0.5 text-accent-ink">
                      Default
                    </span>
                  ) : null}
                </div>

                <address className="mt-4 flex-1 text-sm leading-relaxed text-fg-muted not-italic">
                  <span className="block text-fg">{address.fullName}</span>
                  {address.line1}
                  {address.line2 ? (
                    <>
                      <br />
                      {address.line2}
                    </>
                  ) : null}
                  <br />
                  {address.city}, {address.state}
                  <br />
                  {address.pincode}
                  <br />
                  <span className="mt-2 block font-mono text-xs">
                    +91 {address.phone}
                  </span>
                </address>

                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setEditing(address);
                      setSheetOpen(true);
                    }}
                    className="t-label text-fg-muted transition-colors hover:text-fg disabled:opacity-50"
                  >
                    Edit
                  </button>

                  {!address.isDefault ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        run(address.id, () =>
                          setDefaultAddressAction(address.id),
                        )
                      }
                      className="t-label text-fg-muted transition-colors hover:text-fg disabled:opacity-50"
                    >
                      Set as default
                    </button>
                  ) : null}

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      // No dialog: deleting an address is trivially undone by
                      // adding it again, and a confirm on every small action
                      // trains people to click through them.
                      run(address.id, () => deleteAddressAction(address.id));
                    }}
                    className="t-label ml-auto text-fg-muted transition-colors hover:text-accent-ink disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AddressSheet
        // Remounts per target so defaultValue actually re-seeds; without the key
        // an uncontrolled form keeps whatever the previously edited row put in.
        key={editing?.id ?? "new"}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editing}
      />
    </>
  );
}
