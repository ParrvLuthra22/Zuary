"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { TriangleA } from "@/client/components/layout/Wordmark";
import { RevealText } from "@/client/components/motion/RevealText";
import type { Product } from "@/shared/constants/products";
import { cn, formatINR } from "@/shared/utils";
import { useNotifyStore } from "@/client/stores/notify";
import { useUIStore } from "@/client/stores/ui";

/**
 * Vertical scroll drives a horizontal track of full-height panels.
 *
 * Desktop pins the section with GSAP and translates the track; panel emphasis
 * is written straight to the DOM from the same scroll callback rather than
 * through React state, so a scroll frame costs no re-render.
 *
 * Mobile drops the pin entirely for a native snap carousel — hijacking touch
 * scroll to fake a horizontal rail is worse than just letting it scroll.
 */
export function TrioRail({ products }: { products: Product[] }) {
  const reducedMotion = useUIStore((s) => s.reducedMotion);
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [active, setActive] = useState(0);

  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const pinned = isDesktop === true && !reducedMotion;

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /** Emphasises whichever panel is nearest the horizontal centre. */
  const emphasise = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const centre = window.innerWidth / 2;

    for (const panel of Array.from(track.children) as HTMLElement[]) {
      const rect = panel.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - centre);
      // 1 at dead centre, 0 once a full panel-width away.
      const focus = Math.max(0, 1 - distance / (rect.width || 1));

      const media = panel.querySelector<HTMLElement>("[data-panel-media]");
      const copy = panel.querySelector<HTMLElement>("[data-panel-copy]");

      panel.style.opacity = String(0.6 + 0.4 * focus);
      if (media) media.style.transform = `scale(${1.06 - 0.06 * focus})`;
      if (copy) {
        copy.style.transform = `translateY(${24 - 24 * focus}px)`;
        copy.style.opacity = String(focus);
      }
    }
  }, []);

  useEffect(() => {
    if (!pinned) return;
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    let disposed = false;
    let revert: (() => void) | undefined;

    (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

        const trigger = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          // Scroll length matches the horizontal travel, so the rail moves at
          // roughly the speed the page would have scrolled anyway.
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            track.style.transform = `translate3d(${-self.progress * distance()}px, 0, 0)`;
            emphasise();
          },
        });

        emphasise();
        // This pin changes the document height for everything below it.
        ScrollTrigger.refresh();

        return () => trigger.kill();
      }, section);

      revert = () => ctx.revert();
    })();

    return () => {
      disposed = true;
      revert?.();
    };
  }, [pinned, emphasise]);

  /* Mobile: track which panel the snap carousel has settled on. */
  useEffect(() => {
    if (pinned || isDesktop === null) return;
    const rail = railRef.current;
    if (!rail) return;
    const onScroll = () => {
      const i = Math.round(rail.scrollLeft / (rail.clientWidth * 0.85));
      setActive(Math.min(products.length - 1, Math.max(0, i)));
    };
    rail.addEventListener("scroll", onScroll, { passive: true });
    return () => rail.removeEventListener("scroll", onScroll);
  }, [pinned, isDesktop, products.length]);

  const heading = (
    <header className="px-6 pb-10 md:px-12">
      <p className="t-label text-accent-ink">The trio</p>
      <RevealText as="h2" className="t-display-md mt-3">
        Three cuts. One block.
      </RevealText>
    </header>
  );

  if (!pinned) {
    return (
      <section className="py-20">
        {heading}
        <div
          ref={railRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-6"
        >
          {products.map((product) => (
            // The panel is h-full, so the carousel wrapper has to carry the
            // height itself — without a ratio here it collapses to nothing.
            <div
              key={product.slug}
              className="aspect-[4/5] w-[85%] shrink-0 snap-center"
            >
              <Panel product={product} />
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-2" aria-hidden>
          {products.map((product, i) => (
            <span
              key={product.slug}
              className={cn(
                "h-1 w-6 rounded-full transition-colors duration-[--dur-micro]",
                i === active ? "bg-accent" : "bg-line",
              )}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="h-screen w-full overflow-hidden">
      <div className="flex h-full flex-col justify-center">
        {heading}
        <div
          ref={trackRef}
          className="flex h-[62vh] w-max gap-6 pl-6 will-change-transform md:pl-12"
        >
          {products.map((product) => (
            <div key={product.slug} className="h-full w-[46vw] shrink-0">
              <Panel product={product} />
            </div>
          ))}
          {/* Tail so the last panel can reach the centre. */}
          <div className="h-full w-[20vw] shrink-0" aria-hidden />
        </div>
      </div>
    </section>
  );
}

function Panel({ product }: { product: Product }) {
  if (product.status === "coming-soon") {
    return <ComingSoonPanel product={product} />;
  }
  return <PhotoPanel product={product} />;
}

/**
 * The ComingSoonCard treatment at panel scale: same dashed frame, same
 * triangle, same hover to solid accent, but sized to the rail and opening the
 * notify drawer instead of navigating to a PDP with no gallery.
 */
function ComingSoonPanel({ product }: { product: Product }) {
  const open = useNotifyStore((s) => s.open);

  return (
    <button
      type="button"
      onClick={() => open(product)}
      aria-label={`${product.name} is coming soon — get notified`}
      className={cn(
        "group relative block h-full w-full overflow-hidden rounded-sm text-left",
        "border border-dashed border-line bg-bg-raised",
        "transition-colors duration-[320ms] ease-[--ease-out]",
        "group-hover:border-solid hover:border-solid hover:border-accent",
      )}
    >
      <span className="absolute inset-x-0 top-0 bottom-1/3 flex items-center justify-center">
        <span
          style={{ fontSize: "48px" }}
          className="opacity-40 transition-opacity duration-[320ms] ease-[--ease-out] group-hover:opacity-70"
        >
          <TriangleA />
        </span>
      </span>

      <div
        data-panel-copy
        className="absolute inset-x-0 bottom-0 p-6 transition-[transform,opacity] duration-[--dur-mid] ease-[--ease-out] md:p-8"
      >
        <p className="t-label text-fg-muted">
          ZUARY {String(product.series).padStart(2, "0")}
        </p>

        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h3 className="t-display-md text-fg">{product.name}</h3>
          <span className="t-deva text-lg text-fg-muted">{product.deva}</span>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="t-label text-accent-ink">Coming soon</span>
          <span className="t-label text-accent-ink">Notify me →</span>
        </div>
      </div>
    </button>
  );
}

function PhotoPanel({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group relative block h-full w-full overflow-hidden rounded-sm border border-line"
      style={{ backgroundColor: product.swatch }}
    >
      <div
        data-panel-media
        className="absolute inset-0 transition-transform duration-[--dur-mid] ease-[--ease-out]"
      >
        {product.images[0] && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0]}
            alt={
              product.imageAlts?.[0] ??
              `${product.name}, ${product.colour} ${product.fit} trousers`
            }
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : null}
      </div>

      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-carbon/85 to-transparent" />

      <div
        data-panel-copy
        className="absolute inset-x-0 bottom-0 p-6 transition-[transform,opacity] duration-[--dur-mid] ease-[--ease-out] md:p-8"
      >
        <p className="t-label text-off-white/70">
          ZUARY {String(product.series).padStart(2, "0")}
        </p>

        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h3 className="t-display-md text-off-white">{product.name}</h3>
          <span className="t-deva text-lg text-accent-ink">{product.deva}</span>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="font-mono text-sm text-off-white/80">
            {formatINR(product.price)}
          </span>
          <span className="t-label text-accent-ink">View →</span>
        </div>
      </div>
    </Link>
  );
}
