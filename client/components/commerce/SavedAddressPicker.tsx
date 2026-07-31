"use client";

import type { Address } from "@/server/db/schema";
import { cn } from "@/shared/utils";

export const NEW_ADDRESS = "__new__";

/**
 * Saved addresses as radio cards, with "Use a new address" last.
 *
 * Real radio inputs rather than divs with click handlers: arrow-key navigation
 * within the group, a single tab stop, and the selected state announced — all of
 * which come free from the platform and none of which come free from a div.
 */
export function SavedAddressPicker({
  addresses,
  selectedId,
  onSelect,
}: {
  addresses: Address[];
  /** An address id, or NEW_ADDRESS. */
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="t-label mb-4 text-fg-muted">Deliver to</legend>

      {addresses.map((address) => {
        const active = selectedId === address.id;
        return (
          <label
            key={address.id}
            className={cn(
              "flex cursor-pointer gap-4 rounded-sm border p-4 transition-colors duration-[--dur-micro]",
              active
                ? "border-accent bg-accent/5"
                : "border-line hover:border-fg-muted",
            )}
          >
            <input
              type="radio"
              name="savedAddress"
              value={address.id}
              checked={active}
              onChange={() => onSelect(address.id)}
              className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
            />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-sm text-fg">
                  {address.fullName}
                </span>
                {address.label ? (
                  <span className="t-label text-fg-muted">{address.label}</span>
                ) : null}
                {address.isDefault ? (
                  <span className="t-label text-accent-ink">· Default</span>
                ) : null}
              </span>
              <span className="mt-1.5 block text-sm leading-relaxed text-fg-muted">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}
                <br />
                {address.city}, {address.state} {address.pincode}
                <br />
                <span className="font-mono text-xs">+91 {address.phone}</span>
              </span>
            </span>
          </label>
        );
      })}

      <label
        className={cn(
          "flex cursor-pointer items-center gap-4 rounded-sm border p-4 transition-colors duration-[--dur-micro]",
          selectedId === NEW_ADDRESS
            ? "border-accent bg-accent/5"
            : "border-line hover:border-fg-muted",
        )}
      >
        <input
          type="radio"
          name="savedAddress"
          value={NEW_ADDRESS}
          checked={selectedId === NEW_ADDRESS}
          onChange={() => onSelect(NEW_ADDRESS)}
          className="size-4 shrink-0 accent-[var(--accent)]"
        />
        <span className="t-label text-fg">Use a new address</span>
      </label>
    </fieldset>
  );
}
