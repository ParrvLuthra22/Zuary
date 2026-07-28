"use client";

import Link from "next/link";

import { TriangleA } from "@/components/layout/Wordmark";
import { Magnetic } from "@/components/motion/Magnetic";
import { RevealText } from "@/components/motion/RevealText";
import { ButtonZ } from "@/components/ui/button-z";
import type { Drop } from "@/lib/data/drops";

export function DropBridge({ drop }: { drop: Drop }) {
  return (
    <section className="relative overflow-hidden bg-carbon px-6 py-32 text-center">
      {/* Oversized mark turning behind the copy. CSS only — no scroll work. */}
      <TriangleA
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[zuary-rotate_60s_linear_infinite] text-[38rem] opacity-4 motion-reduce:animate-none"
      />

      <div className="relative z-10 flex flex-col items-center">
        <p className="t-label flex items-center gap-2 text-off-white">
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-accent animate-[zuary-pulse_2s_ease-in-out_infinite] motion-reduce:animate-none"
          />
          {drop.season} — {drop.status === "live" ? "Live" : drop.status}
        </p>

        <RevealText
          as="h2"
          className="t-display-lg mt-6 justify-center text-off-white"
        >
          The Trouser Trio.
        </RevealText>

        <p className="mt-5 max-w-md text-lg text-fg-muted">{drop.tagline}</p>

        <Magnetic strength={8} className="mt-10">
          <ButtonZ asChild size="lg">
            <Link href={`/drops/${drop.slug}`}>Enter the drop →</Link>
          </ButtonZ>
        </Magnetic>
      </div>
    </section>
  );
}
