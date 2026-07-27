"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { checkoutFormSchema, type CheckoutFormInput } from "@/lib/checkout";
import { formatINR } from "@/lib/utils";
import { cartLines, cartSubtotal, useCartStore } from "@/stores/cart";
import type { RazorpayCheckoutResponse } from "@/types/razorpay";

const FIELD =
  "h-12 rounded-sm border-line bg-bg-raised font-mono text-sm placeholder:text-fg-muted/60";

export function CheckoutForm() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const [submitting, setSubmitting] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  const lines = cartLines(items);
  const subtotal = cartSubtotal(items);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormInput>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      email: "",
      phone: "",
      address: {
        name: "",
        line1: "",
        line2: "",
        city: "",
        state: "",
        pincode: "",
        country: "India",
      },
    },
  });

  async function onSubmit(values: CheckoutFormInput) {
    if (items.length === 0) {
      toast("Your cart is empty.");
      return;
    }
    if (!scriptReady || !window.Razorpay) {
      toast("Payment is still loading. One moment.");
      return;
    }
    const Checkout = window.Razorpay;

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, items }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Could not start checkout.");
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
        name: "ZUARY",
        description: `${lines.length} item${lines.length === 1 ? "" : "s"}`,
        order_id: data.razorpayOrderId,
        prefill: {
          name: values.address.name,
          email: values.email,
          contact: values.phone,
        },
        theme: { color: "#FF6B35", backdrop_color: "#121416" },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            toast("Payment cancelled.");
          },
        },
        handler: async (response: RazorpayCheckoutResponse) => {
          const verify = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const verified = await verify.json();

          if (!verify.ok || !verified.ok) {
            toast("We could not verify that payment. Support has been notified.");
            setSubmitting(false);
            return;
          }

          clear();
          router.push(`/orders/${verified.orderId}`);
        },
      });

      checkout.open();
    } catch {
      toast("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-12 lg:grid-cols-[1fr_22rem]"
      >
        <div className="space-y-10">
          <fieldset className="space-y-4">
            <legend className="t-label mb-4 text-accent">Contact</legend>

            <Field label="Email" error={errors.email?.message}>
              <Input
                {...register("email")}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={FIELD}
              />
            </Field>

            <Field label="Mobile" error={errors.phone?.message}>
              <Input
                {...register("phone")}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="9876543210"
                className={FIELD}
              />
            </Field>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="t-label mb-4 text-accent">Ship to</legend>

            <input type="hidden" {...register("address.country")} />

            <Field label="Full name" error={errors.address?.name?.message}>
              <Input
                {...register("address.name")}
                autoComplete="name"
                className={FIELD}
              />
            </Field>

            <Field label="Address" error={errors.address?.line1?.message}>
              <Input
                {...register("address.line1")}
                autoComplete="address-line1"
                placeholder="Flat, building, street"
                className={FIELD}
              />
            </Field>

            <Field label="Landmark (optional)">
              <Input
                {...register("address.line2")}
                autoComplete="address-line2"
                className={FIELD}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City" error={errors.address?.city?.message}>
                <Input
                  {...register("address.city")}
                  autoComplete="address-level2"
                  className={FIELD}
                />
              </Field>
              <Field label="State" error={errors.address?.state?.message}>
                <Input
                  {...register("address.state")}
                  autoComplete="address-level1"
                  className={FIELD}
                />
              </Field>
              <Field label="PIN code" error={errors.address?.pincode?.message}>
                <Input
                  {...register("address.pincode")}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  className={FIELD}
                />
              </Field>
            </div>
          </fieldset>
        </div>

        <aside className="h-fit rounded-sm border border-line bg-bg-raised p-6">
          <h2 className="t-label mb-6 text-fg-muted">Order</h2>

          <ul className="space-y-4">
            {lines.map((line) => (
              <li
                key={`${line.slug}-${line.size}`}
                className="flex justify-between gap-4 font-mono text-sm"
              >
                <span className="text-fg">
                  {line.product.name}
                  <span className="text-fg-muted">
                    {" "}
                    {line.size} × {line.qty}
                  </span>
                </span>
                <span className="text-fg-muted">{formatINR(line.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <Separator className="my-6 bg-line" />

          <div className="space-y-2 font-mono text-sm">
            <Row label="Subtotal" value={formatINR(subtotal)} />
            <Row label="Shipping" value="Free" />
          </div>

          <Separator className="my-6 bg-line" />

          <div className="flex items-baseline justify-between">
            <span className="t-label text-fg-muted">Total</span>
            <span className="font-mono text-lg text-fg">
              {formatINR(subtotal)}
            </span>
          </div>

          <Button
            type="submit"
            disabled={submitting || lines.length === 0}
            className="mt-6 h-14 w-full rounded-sm bg-accent font-mono text-xs tracking-[0.18em] text-carbon uppercase hover:bg-accent-soft disabled:opacity-50"
          >
            {submitting ? "Opening Razorpay…" : "Pay now"}
          </Button>

          <p className="t-label mt-4 text-fg-muted">
            Card, UPI, netbanking. Handled by Razorpay.
          </p>
        </aside>
      </form>
    </>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="t-label text-fg-muted">{label}</Label>
      {children}
      {error ? <p className="t-label text-accent">{error}</p> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-fg-muted">{label}</span>
      <span className="text-fg">{value}</span>
    </div>
  );
}
