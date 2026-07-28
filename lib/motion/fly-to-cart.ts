const STEPS = 24;
const DURATION = 700;
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)";

/**
 * Sends a copy of the product image along a quadratic arc into the cart icon,
 * then pulses the badge.
 *
 * Sampled into keyframes rather than driven by rAF so the browser can run it
 * off the main thread — the cart sheet is opening at the same moment.
 */
export function flyToCart(source: HTMLElement | null) {
  if (typeof window === "undefined" || !source) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const target = document.querySelector<HTMLElement>(
    'header button[aria-label^="Cart"]',
  );
  if (!target) return;

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (from.width === 0 || to.width === 0) return;

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.cssText = `
    position: fixed;
    left: ${from.left}px;
    top: ${from.top}px;
    width: ${from.width}px;
    height: ${from.height}px;
    margin: 0;
    border-radius: 2px;
    overflow: hidden;
    pointer-events: none;
    z-index: 90;
    will-change: transform, opacity;
  `;
  document.body.appendChild(clone);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  // Control point lifted above the straight line, so the arc bows upward.
  const cx = dx * 0.5;
  const cy = Math.min(dy, 0) - Math.abs(dx) * 0.25 - 120;

  const frames = Array.from({ length: STEPS + 1 }, (_, i) => {
    const t = i / STEPS;
    const inv = 1 - t;
    const x = 2 * inv * t * cx + t * t * dx;
    const y = 2 * inv * t * cy + t * t * dy;
    const scale = 1 - 0.9 * t;
    return {
      transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
      opacity: String(1 - 0.85 * t * t),
    };
  });

  const flight = clone.animate(frames, {
    duration: DURATION,
    easing: EASE,
    fill: "forwards",
  });

  flight.finished
    .catch(() => {})
    .finally(() => {
      clone.remove();
      target
        .querySelector<HTMLElement>("span")
        ?.animate(
          [{ scale: "1" }, { scale: "1.45" }, { scale: "1" }],
          { duration: 320, easing: "cubic-bezier(0.34, 1.4, 0.64, 1)" },
        );
    });
}
