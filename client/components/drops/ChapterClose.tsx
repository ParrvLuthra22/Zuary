"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";

import { useCinematic } from "@/client/hooks/useCinematic";
import { Magnetic } from "@/client/components/motion/Magnetic";
import { ButtonZ } from "@/client/components/ui/button-z";

export function ChapterClose() {
  const { cinematic } = useCinematic();
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [0.96, 1]);

  return (
    <section
      ref={ref}
      className="flex min-h-svh flex-col items-center justify-center gap-10 bg-carbon px-6 text-center"
    >
      <motion.p
        className="t-display-xl text-accent-ink"
        style={cinematic ? { scale } : undefined}
      >
        Cut sharp.
      </motion.p>

      <Magnetic strength={8}>
        <ButtonZ asChild size="lg">
          <Link href="/shop">Shop the drop →</Link>
        </ButtonZ>
      </Magnetic>
    </section>
  );
}
