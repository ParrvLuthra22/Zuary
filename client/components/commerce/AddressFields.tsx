"use client";

import { useId } from "react";
import type {
  FieldErrors,
  FieldValues,
  Path,
  UseFormRegister,
  UseFormRegisterReturn,
} from "react-hook-form";

import { INDIAN_STATES, UNION_TERRITORIES } from "@/shared/constants/states";
import { cn } from "@/shared/utils";

/**
 * The address form, in one place.
 *
 * Checkout and the account address sheet both render these. Keeping them here
 * rather than duplicated means the floating-label behaviour, the 36-entry region
 * dropdown and the PIN/phone input modes cannot drift apart — and neither can
 * the validation, which both draw from lib/checkout.ts.
 *
 * The field names differ between the two forms (checkout nests everything under
 * `address.`, the account form does not), so the shared core is generic over the
 * form's value type and takes a prefix.
 */

export const FIELD =
  "peer h-14 w-full rounded-sm border border-line bg-bg px-4 pt-4 font-mono text-sm text-fg outline-none transition-colors duration-[--dur-micro] placeholder-shown:pt-0 focus:border-accent";

/** Walks a dot path into RHF's error tree and pulls the message out. */
export function errorAt(
  errors: FieldErrors,
  path: string,
): string | undefined {
  const node = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, errors);

  if (node && typeof node === "object" && "message" in node) {
    const message = (node as { message?: unknown }).message;
    return typeof message === "string" ? message : undefined;
  }
  return undefined;
}

export function Field({
  label,
  error,
  prefix,
  children,
}: {
  label: string;
  error?: string;
  prefix?: string;
  /** Receives the input id and the id of its error message, if any. */
  children: (id: string, describedBy?: string) => React.ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <div className="relative">
        {children(id, error ? errorId : undefined)}
        {prefix ? (
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-mono text-sm text-fg-muted">
            {prefix}
          </span>
        ) : null}
        <label
          htmlFor={id}
          className={cn(
            // Floated is the default; it only drops to centre while the field
            // is both empty AND unfocused. Expressing it the other way round
            // leaves two equal-specificity rules fighting, and CSS order
            // decides — so focusing an empty field would not lift the label.
            "t-label pointer-events-none absolute top-2 left-4 text-fg-muted",
            "transition-all duration-[--dur-micro]",
            "peer-placeholder-shown:peer-not-focus:top-1/2",
            "peer-placeholder-shown:peer-not-focus:-translate-y-1/2",
            "peer-focus:text-accent-ink",
          )}
        >
          {label}
        </label>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="t-label mt-2 text-accent-deep">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function StateSelect({
  registration,
  error,
  id = "state",
  defaultValue = "",
}: {
  registration: UseFormRegisterReturn;
  error?: string;
  id?: string;
  /** Pre-selects the saved region when editing. */
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="t-label mb-2 block text-fg-muted">
        State / union territory
      </label>
      <select
        id={id}
        defaultValue={defaultValue}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        {...registration}
        className="h-14 w-full rounded-sm border border-line bg-bg px-4 font-mono text-sm text-fg outline-none transition-colors duration-[--dur-micro] focus:border-accent"
      >
        <option value="" disabled>
          Select…
        </option>
        <optgroup label="States">
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </optgroup>
        <optgroup label="Union territories">
          {UNION_TERRITORIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </optgroup>
      </select>
      {error ? (
        <p id={`${id}-error`} role="alert" className="t-label mt-2 text-accent-deep">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The five fields both forms share: street, optional second line, city, PIN and
 * region. Name, phone, label and landmark sit around this and differ per form.
 */
export type AddressCoreDefaults = Partial<
  Record<"line1" | "line2" | "city" | "pincode" | "state", string>
>;

export function AddressCoreFields<T extends FieldValues>({
  register,
  errorFor,
  prefix = "",
  selectId,
  defaults,
}: {
  register: UseFormRegister<T>;
  /**
   * Looks up the message for a bare field name. A callback rather than an
   * errors object so this component is not tied to react-hook-form's error
   * shape — checkout passes an RHF lookup, the account sheet passes a plain
   * map from its server action.
   */
  errorFor: (field: string) => string | undefined;
  /** e.g. "address." for checkout, "" for the account form. */
  prefix?: string;
  selectId?: string;
  /**
   * Initial values, for the uncontrolled/plain-form caller. Checkout leaves
   * this off and seeds its values through useForm's defaultValues instead.
   */
  defaults?: AddressCoreDefaults;
}) {
  const name = (field: string) => `${prefix}${field}` as Path<T>;
  const err = errorFor;

  return (
    <>
      <Field label="Address line 1" error={err("line1")}>
        {(id, describedBy) => (
          <input
            id={id}
            autoComplete="address-line1"
            placeholder=" "
            aria-describedby={describedBy}
            {...register(name("line1"))}
            defaultValue={defaults?.line1}
            className={FIELD}
          />
        )}
      </Field>

      <Field label="Address line 2 (optional)">
        {(id, describedBy) => (
          <input
            id={id}
            autoComplete="address-line2"
            placeholder=" "
            aria-describedby={describedBy}
            {...register(name("line2"))}
            defaultValue={defaults?.line2}
            className={FIELD}
          />
        )}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="City" error={err("city")}>
          {(id, describedBy) => (
            <input
              id={id}
              autoComplete="address-level2"
              placeholder=" "
              aria-describedby={describedBy}
              {...register(name("city"))}
              defaultValue={defaults?.city}
              className={FIELD}
            />
          )}
        </Field>
        <Field label="PIN code" error={err("pincode")}>
          {(id, describedBy) => (
            <input
              id={id}
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder=" "
              aria-describedby={describedBy}
              {...register(name("pincode"))}
              defaultValue={defaults?.pincode}
              className={FIELD}
            />
          )}
        </Field>
      </div>

      <StateSelect
        id={selectId}
        registration={register(name("state"))}
        error={err("state")}
        defaultValue={defaults?.state}
      />
    </>
  );
}
