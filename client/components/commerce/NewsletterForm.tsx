"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { TriangleA } from "@/client/components/layout/Wordmark";
import { ButtonZ } from "@/client/components/ui/button-z";
import { Input } from "@/client/components/ui/input";
import { cn } from "@/shared/utils";

const schema = z.object({
  email: z.string().email("That email does not look right."),
});

type FormValues = z.infer<typeof schema>;

export function NewsletterForm({
  source,
  cta = "Notify me",
  className,
}: {
  source: string;
  cta?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  const [failure, setFailure] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: FormValues) {
    setFailure("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email, source }),
      });
      // No database behind this yet, so a non-JSON body must not throw.
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

  if (done) {
    return (
      <div className={cn("flex flex-col items-center gap-4", className)}>
        <TriangleA className="text-4xl" />
        <p className="t-display-sm">You&rsquo;re on the list.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className={cn("w-full max-w-md", className)}
    >
      <div className="flex gap-2">
        <Input
          {...register("email")}
          type="email"
          placeholder="Email"
          aria-label="Email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "newsletter-error" : undefined}
          className="h-12 rounded-sm border-line bg-bg-raised font-mono text-sm"
        />
        <ButtonZ type="submit" disabled={isSubmitting}>
          {isSubmitting ? "…" : cta}
        </ButtonZ>
      </div>

      {errors.email ? (
        <p
          id="newsletter-error"
          role="alert"
          className="t-label mt-3 text-accent-ink"
        >
          {errors.email.message}
        </p>
      ) : null}
      {failure ? <p className="t-label mt-3 text-fg-muted">{failure}</p> : null}
    </form>
  );
}
