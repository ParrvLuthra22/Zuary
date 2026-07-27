"use client";

import { cn } from "@/lib/utils";

type MarqueeProps = {
  items: string[];
  /** Seconds for one full pass. Larger is slower. */
  speed?: number;
  reverse?: boolean;
  className?: string;
};

/**
 * Two identical tracks side by side, the pair translated by -50%. The seam
 * lands off-screen, so the loop reads as continuous.
 */
export function Marquee({
  items,
  speed = 28,
  reverse = false,
  className,
}: MarqueeProps) {
  const track = [...items, ...items];

  return (
    <div
      className={cn(
        "relative flex overflow-hidden border-y border-line py-4",
        className,
      )}
      aria-hidden
    >
      <div
        className="flex shrink-0 animate-[marquee_var(--marquee-duration)_linear_infinite] items-center gap-10 pr-10 motion-reduce:animate-none"
        style={
          {
            "--marquee-duration": `${speed}s`,
            animationDirection: reverse ? "reverse" : "normal",
          } as React.CSSProperties
        }
      >
        {track.map((item, i) => (
          <span key={`${item}-${i}`} className="t-label text-fg-muted whitespace-nowrap">
            {item}
            <span className="ml-10 text-accent">/</span>
          </span>
        ))}
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translate3d(0, 0, 0); }
          to   { transform: translate3d(-50%, 0, 0); }
        }
      `}</style>
    </div>
  );
}
