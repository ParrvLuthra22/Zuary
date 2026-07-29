"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { TriangleA } from "@/components/layout/Wordmark";
import { ButtonZ } from "@/components/ui/button-z";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SIZES, type Size } from "@/lib/data/products";
import { cn } from "@/lib/utils";
import { useNotifyStore } from "@/stores/notify";

const schema = z.object({
  email: z.string().email("That email does not look right."),
});

type FormValues = z.infer<typeof schema>;

/**
 * CURRENTLY UNUSED — intentionally retained, and deliberately still mounted.
 * Nothing opens it now that all three trousers are live; it stays wired up so
 * ZUARY 04 and the Tier 01 tees only have to flip a product's status to
 * 'coming-soon'. Do not delete it as dead code, and do not unmount it from the
 * layouts — an unmounted drawer is a silent no-op for whoever adds the next
 * coming-soon product.
 *
 * One drawer for the whole app, driven by the notify store — mounted beside
 * the cart sheet so any coming-soon card anywhere can open it without
 * threading state through the tree.
 */
export function NotifyDrawer() {
  const isOpen = useNotifyStore((s) => s.isOpen);
  const product = useNotifyStore((s) => s.product);
  const close = useNotifyStore((s) => s.close);

  const [size, setSize] = useState<Size | null>(null);
  const [done, setDone] = useState(false);
  const [failure, setFailure] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  // Reset on open, not on close: wiping while the sheet is animating out
  // flashes the empty form over the success state.
  useEffect(() => {
    if (!isOpen) return;
    setSize(null);
    setDone(false);
    setFailure("");
    reset({ email: "" });
  }, [isOpen, product?.slug, reset]);

  async function onSubmit(values: FormValues) {
    if (!product) return;
    setFailure("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          size: size ?? undefined,
          product: product.slug,
          source: "notify",
        }),
      });
      // There may be no database behind this yet, so a non-JSON body must not
      // throw — same contract the footer and newsletter forms work to.
      const data = await res.json().catch(() => ({}) as { error?: string });

      if (!res.ok) {
        setFailure(data.error ?? "Could not add you just yet. Try again later.");
        return;
      }
      setDone(true);
    } catch {
      setFailure("Network error. Try again.");
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(next) => (next ? null : close())}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-line bg-bg p-0 sm:max-w-[480px]"
      >
        <SheetHeader className="border-b border-line px-6">
          <SheetTitle className="flex items-baseline gap-3">
            <span className="t-display-sm text-fg">Notify me</span>
            <span className="t-label text-fg-muted">
              {product?.name ?? ""}
            </span>
          </SheetTitle>
        </SheetHeader>

        {done ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6">
            <TriangleA className="text-4xl" />
            <p className="t-display-sm">You&rsquo;re on the list.</p>
            <p className="t-label max-w-xs text-center text-fg-muted">
              We&rsquo;ll write to you the day {product?.name} lands.
            </p>
            <ButtonZ variant="outline" onClick={close} className="mt-2">
              Close
            </ButtonZ>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-1 flex-col gap-8 px-6 py-8"
          >
            <p className="max-w-sm text-sm leading-relaxed text-fg-muted">
              {product?.name} is in production. Leave your email and size and
              we&rsquo;ll tell you the day it lands.
            </p>

            <fieldset>
              <legend className="t-label text-fg-muted">
                Size <span className="normal-case">(optional)</span>
              </legend>
              <div className="mt-4 flex gap-2">
                {SIZES.map((option) => {
                  const active = size === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSize(active ? null : option)}
                      className={cn(
                        "t-label flex-1 rounded-none border py-3 transition-colors duration-[--dur-micro]",
                        active
                          ? "border-accent bg-accent text-carbon"
                          : "border-line text-fg hover:border-fg-muted",
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="notify-email" className="t-label text-fg-muted">
                Email
              </label>
              <Input
                id="notify-email"
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "notify-error" : undefined}
                className="mt-4 h-12 rounded-sm border-line bg-bg-raised font-mono text-sm"
              />
              {errors.email ? (
                <p
                  id="notify-error"
                  role="alert"
                  className="t-label mt-3 text-accent-ink"
                >
                  {errors.email.message}
                </p>
              ) : null}
              {failure ? (
                <p role="alert" className="t-label mt-3 text-fg-muted">
                  {failure}
                </p>
              ) : null}
            </div>

            <ButtonZ
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="mt-auto w-full"
            >
              {isSubmitting ? "…" : "Notify me"}
            </ButtonZ>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
