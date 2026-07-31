"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

import {
  AddressCoreFields,
  Field,
  FIELD,
  errorAt,
} from "@/client/components/commerce/AddressFields";
import { ProductThumb } from "@/client/components/commerce/ProductThumb";
import {
  NEW_ADDRESS,
  SavedAddressPicker,
} from "@/client/components/commerce/SavedAddressPicker";
import { useCartValidation } from "@/client/hooks/useCartValidation";
import { TriangleA } from "@/client/components/layout/Wordmark";
import { ButtonZ } from "@/client/components/ui/button-z";
import { Skeleton } from "@/client/components/ui/skeleton";
import { checkoutFormSchema, type CheckoutFormInput } from "@/shared/validators/checkout";
import { shippingFor } from "@/shared/constants/policies";
import { cn, formatINR } from "@/shared/utils";
import {
  cartLines,
  cartSubtotal,
  useCartHydrated,
  useCartStore,
} from "@/client/stores/cart";
import type { Address } from "@/server/db/schema";
import { paymentFailureReason, track } from "@/client/lib/track";
import type { RazorpayCheckoutResponse } from "@/shared/types/razorpay";

type Step = "contact" | "shipping" | "payment";

/**
 * Hydration gate.
 *
 * The inner form is mounted only once the persisted cart has been read back.
 * That is not cosmetic: returning from a Google redirect is a full page load,
 * so on first paint `items` is the empty initial value. Rendering the form
 * against it would flash a ₹0 summary, fire a cart validation request for an
 * empty cart, and let a fast customer submit into "Your bag is empty" with a
 * bag that is not in fact empty.
 *
 * Mounting conditionally rather than branching inside the form is deliberate —
 * it keeps useCartValidation from running at all until there is a real cart.
 */
export type CheckoutAccount = { email: string | null };

export function CheckoutForm({
  account,
  savedAddresses,
}: {
  /** Null when the session has expired; see CheckoutSignIn. */
  account: CheckoutAccount | null;
  savedAddresses: Address[];
}) {
  const hydrated = useCartHydrated();
  const items = useCartStore((s) => s.items);

  if (!hydrated) return <CheckoutSkeleton />;

  // Only trustworthy after hydration. Never turn this into a redirect: the
  // customer may have arrived here mid-flow and a bounce would lose the page.
  if (items.length === 0) return <CheckoutEmpty />;

  return (
    <CheckoutFormInner account={account} savedAddresses={savedAddresses} />
  );
}

function CheckoutSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="grid gap-12 lg:grid-cols-[1fr_380px]"
    >
      <span className="sr-only">Loading your bag…</span>

      <div className="space-y-8">
        {[0, 1].map((block) => (
          <div key={block} className="space-y-4">
            <Skeleton className="h-3 w-24 rounded-sm" />
            <Skeleton className="h-12 w-full rounded-sm" />
            <Skeleton className="h-12 w-full rounded-sm" />
            <Skeleton className="h-12 w-2/3 rounded-sm" />
          </div>
        ))}
      </div>

      <aside className="h-fit rounded-sm border border-line bg-bg-raised p-6">
        <Skeleton className="h-3 w-28 rounded-sm" />
        <div className="mt-6 space-y-4">
          {[0, 1].map((line) => (
            <div key={line} className="flex gap-3">
              <Skeleton className="h-18 w-14 shrink-0 rounded-sm" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24 rounded-sm" />
                <Skeleton className="h-3 w-16 rounded-sm" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="mt-8 h-px w-full" />
        <Skeleton className="mt-6 h-6 w-32 rounded-sm" />
      </aside>
    </div>
  );
}

function CheckoutEmpty() {
  return (
    <div className="flex flex-col items-start gap-5 py-16">
      <TriangleA className="text-4xl" />
      <p className="t-display-sm">Your bag is empty.</p>
      <p className="max-w-sm text-sm text-fg-muted">
        Nothing to check out. Anything you had saved is still here — this only
        looks empty because the bag really is.
      </p>
      <ButtonZ asChild variant="outline">
        <Link href="/shop">Shop trousers</Link>
      </ButtonZ>
    </div>
  );
}

function CheckoutFormInner({
  account,
  savedAddresses,
}: {
  account: CheckoutAccount | null;
  savedAddresses: Address[];
}) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);

  const [scriptReady, setScriptReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>("contact");

  const defaultAddress =
    savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    defaultAddress?.id ?? NEW_ADDRESS,
  );
  // Only offered when there is nothing saved yet — someone who already has
  // addresses is not trying to build a collection at checkout.
  const [saveAddress, setSaveAddress] = useState(savedAddresses.length === 0);

  const usingNew = selectedAddressId === NEW_ADDRESS;

  const { validation } = useCartValidation(items, true);

  const lines = cartLines(items);
  const subtotal = validation?.subtotalInr ?? cartSubtotal(items);
  const shipping = validation?.shippingInr ?? shippingFor(subtotal);
  const total = validation?.totalInr ?? subtotal + shipping;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormInput>({
    resolver: zodResolver(checkoutFormSchema),
    mode: "onBlur",
    defaultValues: {
      contact: { email: account?.email ?? "", phone: "" },
      address: {
        name: "",
        line1: "",
        line2: "",
        landmark: "",
        city: "",
        state: undefined,
        pincode: "",
        country: "India",
      },
      billingSameAsShipping: true,
    },
  });

  /*
   * Copies a saved address into the form.
   *
   * The submitted payload always comes from the form, whichever way it was
   * filled — so the API keeps one shape and one validation path, and picking a
   * card cannot smuggle an unvalidated address past the schema.
   */
  const applySaved = useCallback(
    (address: Address | undefined) => {
      if (!address) return;
      setValue("address.name", address.fullName, { shouldValidate: true });
      setValue("address.line1", address.line1, { shouldValidate: true });
      setValue("address.line2", address.line2 ?? "");
      setValue("address.city", address.city, { shouldValidate: true });
      setValue("address.state", address.state as never, {
        shouldValidate: true,
      });
      setValue("address.pincode", address.pincode, { shouldValidate: true });
      if (address.phone) {
        setValue("contact.phone", address.phone, { shouldValidate: true });
      }
    },
    [setValue],
  );

  // Seed once from whichever card starts selected.
  useEffect(() => {
    if (defaultAddress) applySaved(defaultAddress);
  }, [defaultAddress, applySaved]);

  /* Fires once per visit to checkout with a non-empty bag. `started` is a ref
     rather than state so a re-render from the validation poll cannot double
     count, and an empty bag is not a started checkout. */
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current || items.length === 0) return;
    startedRef.current = true;
    track("checkout_started", { itemCount: items.length, subtotal });
  }, [items.length, subtotal]);

  async function onSubmit(values: CheckoutFormInput) {
    if (items.length === 0) {
      toast("Your bag is empty.");
      return;
    }
    if (!scriptReady || !window.Razorpay) {
      toast("Payment is still loading. One moment.");
      return;
    }
    const Checkout = window.Razorpay;

    // The form validated and we are about to ask for money.
    track("address_submitted");

    setSubmitting(true);
    setStep("payment");
    try {
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Only slug/size/qty. The server decides what it costs.
        body: JSON.stringify({
          ...values,
          // Advisory. The server dedupes and decides.
          saveAddress: usingNew && saveAddress,
          items: items.map((i) => ({
            slug: i.slug,
            size: i.size,
            qty: i.qty,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        // Session died between page load and pay. Send them to sign in and
        // come straight back; the cart is in localStorage and survives.
        toast("Sign in to complete your order.");
        track("login_required_shown");
        router.push("/login?next=%2Fcheckout");
        return;
      }
      if (!res.ok) {
        track("payment_failed", { reason: paymentFailureReason(data) });
        toast(data.message ?? data.error ?? "Could not start checkout.");
        setStep("shipping");
        return;
      }

      const key = data.keyId ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!key) {
        toast("Payments are not configured. Contact support.");
        return;
      }

      const checkout = new Checkout({
        key,
        amount: data.amount,
        currency: data.currency,
        order_id: data.razorpayOrderId,
        name: "ZUARY",
        description: "Trousers",
        prefill: {
          name: values.address.name,
          email: values.contact.email,
          contact: values.contact.phone,
        },
        theme: { color: "#FF6B35" },
        modal: {
          // The order row stays 'created' — it is a real attempt, and the
          // webhook may still settle it. Never delete it here.
          ondismiss: () => {
            setSubmitting(false);
            setStep("shipping");
            track("payment_failed", { reason: "dismissed" });
            toast("Payment cancelled. Your bag is untouched.");
          },
        },
        handler: async (response: RazorpayCheckoutResponse) => {
          const verify = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...response, ourOrderId: data.ourOrderId }),
          });
          const verified = await verify.json().catch(() => ({}));

          if (!verify.ok || !verified.ok) {
            /* Not necessarily a lost payment — the webhook is the source of
               truth and may still settle it. Recorded as a failure of THIS
               path so the funnel shows how often the fast path loses the race,
               then the customer goes to the order page, which polls. */
            track("payment_failed", {
              reason: paymentFailureReason(verified),
            });
            router.push(`/orders/${data.ourOrderId}`);
            return;
          }

          track("payment_completed", {
            orderId: verified.orderId,
            total: data.amount / 100,
          });
          clear();
          router.push(`/orders/${verified.orderId}`);
        },
      });

      // The modal is about to take over. `amount` is paise from our own
      // server, which is the figure actually being charged.
      track("payment_initiated", { total: data.amount / 100 });
      checkout.open();
    } catch (error) {
      track("payment_failed", { reason: paymentFailureReason(error) });
      toast("Network error. Try again.");
      setStep("shipping");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => setScriptReady(true)}
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="grid gap-12 lg:grid-cols-[1fr_22rem]"
      >
        <div>
          <Steps active={step} />

          <fieldset
            className="mt-12 space-y-5"
            onFocus={() => setStep("contact")}
          >
            <legend className="t-label mb-5 text-accent-ink">Contact</legend>

            {account?.email ? (
              /* Signed in: the order is attached to this account, so the email
                 is the account's and not a free-text field. Still registered so
                 it reaches the API and the schema — just not editable. */
              <div>
                <p className="t-label text-fg-muted">Email</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <span className="font-mono text-sm break-all text-fg">
                    {account.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => void signOut({ redirectTo: "/login?next=%2Fcheckout" })}
                    className="t-label shrink-0 text-fg-muted underline-offset-4 transition-colors hover:text-accent-ink hover:underline"
                  >
                    Not you? Sign out
                  </button>
                </div>
                <input type="hidden" {...register("contact.email")} />
                {errors.contact?.email?.message ? (
                  <p role="alert" className="t-label mt-2 text-accent-deep">
                    {errors.contact.email.message}
                  </p>
                ) : null}
              </div>
            ) : (
              <Field label="Email" error={errors.contact?.email?.message}>
                {(id, describedBy) => (
                  <input
                    id={id}
                    type="email"
                    autoComplete="email"
                    placeholder=" "
                    aria-describedby={describedBy}
                    {...register("contact.email")}
                    className={FIELD}
                  />
                )}
              </Field>
            )}
            <Field
              label="Phone"
              prefix="+91"
              error={errors.contact?.phone?.message}
            >
              {(id, describedBy) => (
                <input
                  id={id}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder=" "
                  aria-describedby={describedBy}
                  {...register("contact.phone")}
                  className={cn(FIELD, "pl-14")}
                />
              )}
            </Field>
          </fieldset>

          <fieldset
            className="mt-12 space-y-5"
            onFocus={() => setStep("shipping")}
          >
            <legend className="t-label mb-5 text-accent-ink">Shipping</legend>

            <input type="hidden" {...register("address.country")} />

            {savedAddresses.length > 0 ? (
              <div className="mb-8">
                <SavedAddressPicker
                  addresses={savedAddresses}
                  selectedId={selectedAddressId}
                  onSelect={(id) => {
                    setSelectedAddressId(id);
                    if (id === NEW_ADDRESS) {
                      // Clear, so the revealed form is not pre-filled with the
                      // previous card's values.
                      setValue("address.name", "");
                      setValue("address.line1", "");
                      setValue("address.line2", "");
                      setValue("address.city", "");
                      setValue("address.state", "" as never);
                      setValue("address.pincode", "");
                    } else {
                      applySaved(savedAddresses.find((a) => a.id === id));
                    }
                  }}
                />
              </div>
            ) : null}

            {/* The editable form is hidden while a saved card is selected, but
                stays mounted: unmounting it would drop the registered fields
                and the values applySaved just wrote into them. */}
            <div className={usingNew ? "space-y-5" : "hidden"}>
            <Field label="Full name" error={errors.address?.name?.message}>
              {(id, describedBy) => (
                <input
                  id={id}
                  autoComplete="name"
                  placeholder=" "
                  aria-describedby={describedBy}
                  {...register("address.name")}
                  className={FIELD}
                />
              )}
            </Field>

            <AddressCoreFields
              register={register}
              errorFor={(field) => errorAt(errors, `address.${field}`)}
              prefix="address."
              selectId="checkout-state"
            />

            {savedAddresses.length === 0 ? (
              <label className="flex cursor-pointer items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(event) => setSaveAddress(event.target.checked)}
                  className="size-4 accent-[var(--accent)]"
                />
                <span className="t-label text-fg-muted">
                  Save this address to my account
                </span>
              </label>
            ) : null}
            </div>

            <label className="flex cursor-pointer items-center gap-3 pt-2">
              <input
                type="checkbox"
                {...register("billingSameAsShipping")}
                className="size-4 accent-[var(--accent)]"
              />
              <span className="t-label text-fg-muted">
                Billing address same as shipping
              </span>
            </label>
          </fieldset>
        </div>

        <aside className="h-fit rounded-sm border border-line bg-bg-raised p-6 lg:sticky lg:top-28">
          <h2 className="t-label text-fg-muted">Order summary</h2>

          <ul className="mt-6 space-y-4">
            {lines.map((line) => (
              <li key={`${line.slug}-${line.size}`} className="flex gap-3">
                <ProductThumb
                  product={line.product}
                  sizes="56px"
                  className="h-18 w-14"
                />
                <div className="flex flex-1 items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm text-fg">
                      {line.product.name}
                    </p>
                    <p className="t-label mt-1 text-fg-muted">
                      {line.size} × {line.qty}
                    </p>
                  </div>
                  <span className="font-mono text-sm text-fg-muted">
                    {formatINR(line.lineTotal)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-2 border-t border-line pt-6 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-fg-muted">Subtotal</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fg-muted">Shipping</span>
              <span>{shipping === 0 ? "Free" : formatINR(shipping)}</span>
            </div>
          </div>

          <div className="mt-6 border-t border-line pt-6">
            <p className="t-label text-fg-muted">Order total</p>
            <p className="t-display-sm mt-1">{formatINR(total)}</p>
          </div>

          {/* With no session the API would answer 401, so the button says what
              actually happens next instead of inviting a failed attempt. It
              still submits nothing — it navigates. */}
          {account ? (
            <ButtonZ
              type="submit"
              size="lg"
              disabled={submitting || lines.length === 0}
              className="mt-6 w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Opening Razorpay
                </>
              ) : (
                `Pay ${formatINR(total)}`
              )}
            </ButtonZ>
          ) : (
            <ButtonZ
              type="button"
              size="lg"
              onClick={() => router.push("/login?next=%2Fcheckout")}
              className="mt-6 w-full"
            >
              Sign in to pay {formatINR(total)}
            </ButtonZ>
          )}

          <p className="t-label mt-4 text-fg-muted">
            Card, UPI, netbanking. Handled by Razorpay.
          </p>
        </aside>
      </form>
    </>
  );
}



/** Floating label: the input carries placeholder=" " so :placeholder-shown works. */
function Steps({ active }: { active: Step }) {
  const steps: Step[] = ["contact", "shipping", "payment"];
  return (
    <ol className="flex items-center gap-4">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-4">
          <span
            className={cn(
              "t-label transition-colors duration-[--dur-micro]",
              s === active ? "text-accent-ink" : "text-fg-muted",
            )}
            aria-current={s === active ? "step" : undefined}
          >
            {s}
          </span>
          {i < steps.length - 1 ? (
            <span aria-hidden className="h-px w-8 bg-line" />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
