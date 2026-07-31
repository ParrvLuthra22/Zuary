/** Visually hidden until focused, then the first thing a keyboard user hits. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only z-[200] focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:rounded-sm focus:bg-accent focus:px-4 focus:py-3 focus:font-mono focus:text-xs focus:tracking-[0.18em] focus:text-carbon focus:uppercase"
    >
      Skip to content
    </a>
  );
}
