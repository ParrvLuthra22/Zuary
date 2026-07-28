"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { TriangleA } from "@/components/layout/Wordmark";
import { RevealText } from "@/components/motion/RevealText";
import { fadeUp, inView } from "@/lib/motion/variants";
import { Input } from "@/components/ui/input";
import { ButtonZ } from "@/components/ui/button-z";

const schema = z.object({
  email: z.string().email("That email does not look right."),
});

type FormValues = z.infer<typeof schema>;

export function WaitlistSection() {
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
        body: JSON.stringify({ email: values.email, source: "homepage" }),
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

  return (
    <section className="bg-bg px-6 py-24">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        {done ? (
          <>
            <TriangleA className="text-4xl" />
            <p className="t-display-sm mt-6">You&rsquo;re on the list.</p>
          </>
        ) : (
          <>
            <RevealText as="h2" className="t-display-sm justify-center">
              Tier 01 lands soon.
            </RevealText>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={inView}
              className="mt-4 text-fg-muted"
            >
              Tees and basics from ₹999. Get told first.
            </motion.p>

            <motion.form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={inView}
              className="mt-8 w-full max-w-md"
            >
              <div className="flex gap-2">
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="Email"
                  aria-label="Email"
                  aria-invalid={Boolean(errors.email)}
                  className="h-12 rounded-sm border-line bg-bg-raised font-mono text-sm"
                />
                <ButtonZ type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "…" : "Notify me"}
                </ButtonZ>
              </div>

              {errors.email ? (
                <p className="t-label mt-3 text-accent">{errors.email.message}</p>
              ) : null}
              {failure ? (
                <p className="t-label mt-3 text-fg-muted">{failure}</p>
              ) : null}
            </motion.form>
          </>
        )}
      </div>
    </section>
  );
}
