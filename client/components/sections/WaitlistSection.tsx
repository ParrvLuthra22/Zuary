"use client";

import { motion } from "framer-motion";

import { NewsletterForm } from "@/client/components/commerce/NewsletterForm";
import { RevealText } from "@/client/components/motion/RevealText";
import { fadeUp, inView } from "@/shared/motion/variants";

export function WaitlistSection() {
  return (
    <section className="bg-bg px-6 py-24">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
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

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={inView}
          className="mt-8 flex w-full justify-center"
        >
          <NewsletterForm source="homepage" />
        </motion.div>
      </div>
    </section>
  );
}
