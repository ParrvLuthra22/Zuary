export default function HomePage() {
  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6">
      <h1 className="t-display-xl flex items-center text-fg">
        <span>ZU</span>
        {/* The A is a CSS triangle, not a glyph. */}
        <span
          aria-hidden
          className="mx-[0.06em] inline-block bg-accent"
          style={{
            width: "0.62em",
            height: "0.56em",
            clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
          }}
        />
        <span className="sr-only">A</span>
        <span>RY</span>
      </h1>

      <p className="t-label mt-8 text-accent">Cut sharp.</p>
    </section>
  );
}
