"use client";

import { RevealText } from "@/client/components/motion/RevealText";
import type { Drop } from "@/shared/constants/drops";

const RELEASE = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function ChapterTitle({ drop }: { drop: Drop }) {
  return (
    <section className="relative flex min-h-svh flex-col justify-center overflow-hidden bg-carbon px-6 py-24 md:px-12">
      <RevealText
        as="h1"
        by="char"
        stagger={0.04}
        className="t-display-xl max-w-[16ch] text-off-white"
      >
        {drop.title.toUpperCase()}
      </RevealText>

      <div className="mt-10 flex items-center gap-3">
        <span className="t-label text-off-white">{drop.season}</span>
        <span
          aria-hidden
          className="size-1.5 animate-[zuary-pulse_2s_ease-in-out_infinite] rounded-full bg-accent motion-reduce:animate-none"
        />
      </div>

      <p className="mt-4 max-w-md text-lg text-fg-muted">{drop.tagline}</p>

      <div className="mt-16 flex items-end justify-between gap-6 md:absolute md:inset-x-0 md:bottom-10 md:mt-0 md:px-12">
        {drop.status === "live" ? (
          <span className="t-label rounded-none bg-accent px-3 py-1.5 text-carbon">
            Live now
          </span>
        ) : (
          <span className="t-label border border-line px-3 py-1.5 text-fg-muted">
            {drop.status}
          </span>
        )}

        <time dateTime={drop.releasedAt} className="t-label text-fg-muted">
          {RELEASE.format(new Date(drop.releasedAt))}
        </time>
      </div>
    </section>
  );
}
