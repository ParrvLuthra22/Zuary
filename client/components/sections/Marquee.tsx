import { TriangleA } from "@/client/components/layout/Wordmark";
import { cn } from "@/shared/utils";

type MarqueeProps = {
  items: string[];
  /** Seconds for one full pass. Larger is slower. */
  speed?: number;
  reverse?: boolean;
  /** outline = hairline rules top and bottom, no fill. */
  variant?: "outline" | "plain";
  className?: string;
};

/**
 * Two identical runs inside one track, translated by -50%. The seam lands
 * off-screen, so the loop reads as continuous. The track is clipped by an
 * overflow-hidden parent so it can never widen the page.
 */
export function Marquee({
  items,
  speed = 28,
  reverse = false,
  variant = "outline",
  className,
}: MarqueeProps) {
  const run = [...items, ...items];

  return (
    <div
      className={cn(
        "relative flex w-full max-w-full overflow-hidden py-6",
        variant === "outline" && "border-y border-line",
        className,
      )}
      aria-hidden
    >
      <div
        className="flex w-max shrink-0 animate-[zuary-marquee_var(--marquee-duration)_linear_infinite] items-center motion-reduce:animate-none"
        style={
          {
            "--marquee-duration": `${speed}s`,
            animationDirection: reverse ? "reverse" : "normal",
          } as React.CSSProperties
        }
      >
        {run.map((item, i) => (
          <span key={`${item}-${i}`} className="flex items-center">
            <span className="t-label whitespace-nowrap text-fg-muted">
              {item}
            </span>
            <TriangleA className="mx-8 text-[0.5rem]" />
          </span>
        ))}
      </div>
    </div>
  );
}
