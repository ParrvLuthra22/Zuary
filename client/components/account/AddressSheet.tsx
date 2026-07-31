"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createAddressAction,
  updateAddressAction,
} from "@/server/actions/addresses.actions";
import {
  AddressCoreFields,
  FIELD,
  Field,
} from "@/client/components/commerce/AddressFields";
import { ButtonZ } from "@/client/components/ui/button-z";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/client/components/ui/sheet";
import type { Address } from "@/server/db/schema";

/**
 * Add / edit in a sheet.
 *
 * Submits FormData straight to the server action rather than through
 * react-hook-form: the action re-validates with the same zod schema anyway, so
 * a client-side copy of the rules would be a second source of truth for no
 * gain. Field errors come back from the action and are rendered in place.
 *
 * AddressCoreFields is generic over a react-hook-form shape, so the plain-form
 * path passes a small shim that just emits `name` attributes — the markup and
 * the region list stay shared with checkout either way.
 */
export function AddressSheet({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Null for a new address. */
  editing: Address | null;
}) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(formData: FormData) {
    setErrors({});
    startTransition(async () => {
      const result = editing
        ? await updateAddressAction(editing.id, formData)
        : await createAddressAction(formData);

      if (result.ok) {
        toast(editing ? "Address updated." : "Address saved.");
        onOpenChange(false);
        return;
      }
      setErrors(result.fieldErrors ?? {});
      toast(result.error);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-line bg-bg p-0 sm:max-w-[520px]"
      >
        <SheetHeader className="border-b border-line px-6">
          <SheetTitle className="t-display-sm text-fg">
            {editing ? "Edit address" : "Add address"}
          </SheetTitle>
        </SheetHeader>

        <form
          action={onSubmit}
          className="flex-1 space-y-5 overflow-y-auto px-6 py-8"
        >
          <Field label="Label (optional)" error={errors.label}>
            {(id, describedBy) => (
              <input
                id={id}
                name="label"
                placeholder=" "
                defaultValue={editing?.label ?? ""}
                aria-describedby={describedBy}
                className={FIELD}
              />
            )}
          </Field>

          <Field label="Full name" error={errors.fullName}>
            {(id, describedBy) => (
              <input
                id={id}
                name="fullName"
                autoComplete="name"
                placeholder=" "
                defaultValue={editing?.fullName ?? ""}
                aria-describedby={describedBy}
                className={FIELD}
              />
            )}
          </Field>

          <Field label="Phone" error={errors.phone} prefix="+91">
            {(id, describedBy) => (
              <input
                id={id}
                name="phone"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder=" "
                defaultValue={editing?.phone ?? ""}
                aria-describedby={describedBy}
                className={`${FIELD} pl-14`}
              />
            )}
          </Field>

          <AddressCoreFields
            register={plainRegister}
            errorFor={(field) => errors[field]}
            selectId="address-sheet-state"
            defaults={{
              line1: editing?.line1 ?? "",
              line2: editing?.line2 ?? "",
              city: editing?.city ?? "",
              pincode: editing?.pincode ?? "",
              state: editing?.state ?? "",
            }}
          />

          <label className="flex cursor-pointer items-center gap-3 pt-2">
            <input
              type="checkbox"
              name="isDefault"
              defaultChecked={editing?.isDefault ?? false}
              className="size-4 accent-[var(--accent)]"
            />
            <span className="t-label text-fg-muted">
              Use as my default address
            </span>
          </label>

          <div className="flex gap-3 pt-4">
            <ButtonZ type="submit" disabled={pending} className="flex-1">
              {pending ? "Saving…" : editing ? "Save changes" : "Save address"}
            </ButtonZ>
            <ButtonZ
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </ButtonZ>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Stands in for react-hook-form's register so AddressCoreFields can be reused
 * by a plain uncontrolled form. It only needs to produce the `name` attribute;
 * the browser collects the values and the server action validates them.
 */
const plainRegister = ((name: string) => ({ name })) as never;
