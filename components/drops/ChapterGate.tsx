import Link from "next/link";

import { DropCountdown } from "@/components/drops/DropCountdown";
import { TriangleA } from "@/components/layout/Wordmark";
import { ButtonZ } from "@/components/ui/button-z";
import type { Drop } from "@/lib/data/drops";

const RELEASE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * What an upcoming drop shows someone without early access: when it opens, and
 * a way to be told. No product imagery and no prices — the point of the gate is
 * that the drop is not browsable yet.
 */
export function DropLocked({ drop }: { drop: Drop }) {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center border-t border-line px-6 py-24 text-center">
      <span style={{ fontSize: "56px" }}>
        <TriangleA />
      </span>

      <p className="t-label mt-10 text-accent-ink">{drop.season}</p>
      <h2 className="t-display-md mt-4">Not open yet.</h2>

      <p className="mt-5 max-w-md text-fg-muted">
        {drop.title} opens on{" "}
        <time dateTime={drop.releasedAt} className="text-fg">
          {RELEASE.format(new Date(drop.releasedAt))}
        </time>
        .
      </p>

      <div className="mt-12">
        <DropCountdown releasedAt={drop.releasedAt} />
      </div>

      <ButtonZ asChild className="mt-14">
        <Link href="/#waitlist">Tell me when it opens</Link>
      </ButtonZ>
    </section>
  );
}

/** The band an early-access customer sees above the products. */
export function EarlyAccessBand() {
  return (
    <aside className="border-y border-accent/40 bg-accent/10 px-6 py-5 md:px-12">
      <p className="t-label flex flex-wrap items-center gap-3 text-accent-ink">
        <TriangleA className="text-sm" />
        You have early access — this drop is not public yet.
      </p>
    </aside>
  );
}
