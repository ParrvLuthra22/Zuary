"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { TriangleA } from "@/client/components/layout/Wordmark";
import { Button } from "@/client/components/ui/button";
import {
  getProduct,
  type Product,
  type ProductSlug,
} from "@/shared/constants/products";
import { formatINR } from "@/shared/utils";
import { useUIStore } from "@/client/stores/ui";

export type HeroScrubProps = {
  mode?: "sequence" | "crossfade";
  frames?: number;
  basePath?: string;
  /** Stacked and cross-dissolved when mode is 'crossfade'. [0] is the static
   *  frame used on mobile and under reduced motion in both modes. */
  fallbackImages?: string[];
  /**
   * The trouser the hero is selling. Its slug drives the spec lines, the
   * outro name, the price and the CTA — pass the same one the imagery shows
   * or the hero will describe a garment it is not displaying.
   */
  productSlug?: ProductSlug;
};

const READY_AT = 0.8;

/** Mill reads "Bhilwara, Rajasthan"; the rail only has room for the town. */
const specLinesFor = (product: Product | undefined) => [
  `${product?.weight ?? "280 GSM"} ${(product?.fabric ?? "cotton twill").toUpperCase()}`,
  `MILL-WOVEN, ${(product?.mill ?? "Tirupur").split(",")[0].toUpperCase()}`,
  "FOUR SIZES, ONE CUT",
];

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
/** 0 before `from`, 1 after `to`, linear between. */
const seg = (p: number, from: number, to: number) =>
  clamp01((p - from) / (to - from));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* Overlay choreography, in scrub progress. */
const CUE = {
  wordmark: { in: [0, 0.06], out: [0.15, 0.28], track: [0, 0.15] },
  engineered: { in: [0.15, 0.24], out: [0.35, 0.44] },
  spec: { start: 0.35, step: 0.1, fade: 0.08, out: [0.66, 0.72] },
  outro: { in: [0.72, 0.84] },
} as const;

export function HeroScrub({
  mode = "sequence",
  frames = 48,
  basePath = "/sequence/hero",
  fallbackImages = [],
  productSlug = "kohl",
}: HeroScrubProps) {
  const reducedMotion = useUIStore((s) => s.reducedMotion);
  const product = getProduct(productSlug);
  const specLines = specLinesFor(product);

  // Null until measured. Rendering the static hero first means a phone never
  // starts the sequence download, even for a frame.
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(0);
  const [failed, setFailed] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const lastDrawn = useRef(-1);

  const wordmarkRef = useRef<HTMLDivElement>(null);
  const engineeredRef = useRef<HTMLDivElement>(null);
  const specRef = useRef<HTMLUListElement>(null);
  const outroRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);

  const scrubbable = isDesktop === true && !reducedMotion;
  const useSequence = scrubbable && mode === "sequence";
  const ready = !useSequence || loaded >= Math.ceil(frames * READY_AT) || failed;

  const frameSrc = useCallback(
    (i: number) => `${basePath}/${String(i + 1).padStart(4, "0")}.webp`,
    [basePath],
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /* ── Preload ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!useSequence) return;

    let cancelled = false;
    let done = 0;
    let errors = 0;
    const images: HTMLImageElement[] = new Array(frames);
    imagesRef.current = images;

    const tick = () => {
      if (cancelled) return;
      done += 1;
      setLoaded(done);
    };

    const load = (i: number) => {
      const img = new window.Image();
      img.decoding = "async";
      if (i < 4) img.fetchPriority = "high";
      img.onload = tick;
      img.onerror = () => {
        errors += 1;
        // A missing sequence must not leave the hero stuck behind its loader.
        if (!cancelled && errors > frames * 0.5) setFailed(true);
        tick();
      };
      img.src = frameSrc(i);
      images[i] = img;
    };

    // First frames immediately, the rest in batches so the network is not
    // saturated before anything is drawable.
    const HEAD = Math.min(12, frames);
    for (let i = 0; i < HEAD; i += 1) load(i);

    let cursor = HEAD;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const next = () => {
      if (cancelled) return;
      const end = Math.min(frames, cursor + 12);
      for (let i = cursor; i < end; i += 1) load(i);
      cursor = end;
      if (cursor < frames) timer = setTimeout(next, 60);
    };
    timer = setTimeout(next, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [useSequence, frames, frameSrc]);

  /* ── Canvas drawing ──────────────────────────────────────── */
  const draw = useCallback(
    (index: number, force = false) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const isLoaded = (i: number) => {
        const img = imagesRef.current[i];
        return Boolean(img?.complete && img.naturalWidth > 0);
      };

      // Walk outwards for the closest frame that actually arrived.
      let use = index;
      if (!isLoaded(use)) {
        let found = -1;
        for (let d = 1; d < frames; d += 1) {
          if (use - d >= 0 && isLoaded(use - d)) {
            found = use - d;
            break;
          }
          if (use + d < frames && isLoaded(use + d)) {
            found = use + d;
            break;
          }
        }
        if (found === -1) return;
        use = found;
      }
      if (!force && lastDrawn.current === use) return;

      const img = imagesRef.current[use];
      const ctx = canvas.getContext("2d");
      if (!ctx || !img) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
        canvas.width = cw * dpr;
        canvas.height = ch * dpr;
      }

      // cover: fill the box on the tighter axis, centre the overflow.
      const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      lastDrawn.current = use;
    },
    [frames],
  );

  /* ── Overlay painting ────────────────────────────────────────
     Written straight to the DOM. Routing scrub progress through React
     state would re-render the whole hero on every scroll frame. */
  const paint = useCallback(
    (p: number) => {
      const show = (node: HTMLElement | null, opacity: number) => {
        if (!node) return;
        node.style.opacity = String(opacity);
        node.style.pointerEvents = opacity > 0.5 ? "auto" : "none";
      };

      const wordmark = wordmarkRef.current;
      if (wordmark) {
        const o =
          seg(p, CUE.wordmark.in[0], CUE.wordmark.in[1]) *
          (1 - seg(p, CUE.wordmark.out[0], CUE.wordmark.out[1]));
        show(wordmark, o);
        const t = seg(p, CUE.wordmark.track[0], CUE.wordmark.track[1]);
        wordmark.style.letterSpacing = `${lerp(0.15, -0.04, t)}em`;
      }

      show(
        engineeredRef.current,
        seg(p, CUE.engineered.in[0], CUE.engineered.in[1]) *
          (1 - seg(p, CUE.engineered.out[0], CUE.engineered.out[1])),
      );

      const specOut = 1 - seg(p, CUE.spec.out[0], CUE.spec.out[1]);
      const items = specRef.current?.children;
      if (items) {
        for (let i = 0; i < items.length; i += 1) {
          const from = CUE.spec.start + i * CUE.spec.step;
          show(
            items[i] as HTMLElement,
            seg(p, from, from + CUE.spec.fade) * specOut,
          );
        }
      }

      show(outroRef.current, seg(p, CUE.outro.in[0], CUE.outro.in[1]));

      if (railRef.current) railRef.current.style.height = `${p * 100}%`;
    },
    [],
  );

  /* ── ScrollTrigger ───────────────────────────────────────── */
  useEffect(() => {
    if (!scrubbable || !ready) return;
    const section = sectionRef.current;
    if (!section) return;

    let disposed = false;
    let revert: (() => void) | undefined;

    // Mobile never reaches this branch, so GSAP is loaded here rather than
    // shipped in the bundle every visitor downloads.
    (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (disposed) return;

      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        const trigger = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: "+=250%",
          pin: true,
          pinSpacing: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const p = self.progress;
            paint(p);

            if (mode === "sequence") {
              draw(Math.round(p * (frames - 1)));
            } else if (layersRef.current) {
              const n = fallbackImages.length;
              const index = p * (n - 1);
              const kids = layersRef.current.children;
              for (let i = 0; i < kids.length; i += 1) {
                (kids[i] as HTMLElement).style.opacity = String(
                  clamp01(1 - Math.abs(index - i)),
                );
              }
              layersRef.current.style.transform = `scale(${lerp(1.08, 1, p)})`;
            }
          },
        });

        paint(0);
        if (mode === "sequence") draw(0, true);

        let resizeTimer: ReturnType<typeof setTimeout>;
        const onResize = () => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            if (mode === "sequence") draw(lastDrawn.current, true);
            ScrollTrigger.refresh();
          }, 200);
        };
        window.addEventListener("resize", onResize);

        return () => {
          clearTimeout(resizeTimer);
          window.removeEventListener("resize", onResize);
          trigger.kill();
        };
      }, section);

      revert = () => ctx.revert();
    })();

    return () => {
      disposed = true;
      revert?.();
    };
  }, [scrubbable, ready, mode, frames, fallbackImages, draw, paint]);

  const still = fallbackImages[0];

  /* ── Static hero: mobile, reduced motion, and first paint ── */
  if (!scrubbable) {
    return (
      <section className="relative h-[85svh] min-h-[32rem] w-full overflow-hidden bg-bg-deep">
        {still ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={still}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-70"
          />
        ) : null}

        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
          <p className="t-display-xl text-fg">
            ZU
            <TriangleA className="mx-[0.06em]" />
            <span className="sr-only">A</span>
            RY
          </p>
          <p className="t-label text-fg-muted">Engineered fit</p>
          <HeroCta product={product} />
        </div>
      </section>
    );
  }

  return (
    <>
      {mode === "sequence" ? (
        <link rel="preload" as="image" href={frameSrc(0)} />
      ) : null}

      <section
        ref={sectionRef}
        aria-label={`${product?.name ?? "ZUARY"} — engineered fit`}
        className="relative h-screen w-full overflow-hidden bg-bg-deep"
      >
        {!ready ? <Loader loaded={loaded} total={frames} /> : null}

        <div
          className="absolute inset-0 transition-opacity duration-[--dur-slow]"
          style={{ opacity: ready ? 1 : 0 }}
        >
          {mode === "sequence" ? (
            <canvas
              ref={canvasRef}
              aria-hidden
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <div ref={layersRef} className="absolute inset-0 will-change-transform">
              {fallbackImages.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ opacity: i === 0 ? 1 : 0 }}
                />
              ))}
            </div>
          )}

          <div className="absolute inset-0 bg-bg-deep/45" aria-hidden />
        </div>

        {/* Overlay */}
        <div className="relative z-10 h-full">
          <div
            ref={wordmarkRef}
            className="t-display-xl absolute inset-0 flex items-center justify-center text-fg"
            style={{ opacity: 0 }}
          >
            ZU
            <TriangleA className="mx-[0.06em]" />
            <span className="sr-only">A</span>
            RY
          </div>

          <div
            ref={engineeredRef}
            className="absolute inset-0 flex items-center justify-center"
            style={{ opacity: 0 }}
          >
            <p className="t-label text-fg">Engineered fit</p>
          </div>

          <ul
            ref={specRef}
            className="absolute inset-y-0 right-12 flex flex-col justify-center gap-5 md:right-20"
          >
            {specLines.map((line) => (
              <li
                key={line}
                className="flex items-center justify-end gap-4"
                style={{ opacity: 0 }}
              >
                <span className="h-px w-12 bg-accent" aria-hidden />
                <span className="t-label text-fg">{line}</span>
              </li>
            ))}
          </ul>

          <div
            ref={outroRef}
            className="absolute inset-0 flex flex-col items-center justify-center gap-5"
            style={{ opacity: 0 }}
          >
            <p className="t-display-lg text-fg">{product?.name}</p>
            <p className="font-mono text-sm text-fg-muted">
              {product ? formatINR(product.price) : null}
            </p>
            <HeroCta product={product} />
          </div>

          {/* Scroll rail */}
          <div
            aria-hidden
            className="absolute top-0 right-4 h-full w-px bg-line md:right-6"
          >
            <span
              ref={railRef}
              className="block w-px bg-accent"
              style={{ height: "0%" }}
            />
          </div>
        </div>
      </section>
    </>
  );
}

function HeroCta({ product }: { product: Product | undefined }) {
  if (!product) return null;
  return (
    <Button
      asChild
      className="h-12 rounded-sm bg-accent px-8 font-mono text-xs tracking-[0.18em] text-carbon uppercase hover:bg-accent-soft"
    >
      <Link href={`/products/${product.slug}`}>View {product.name}</Link>
    </Button>
  );
}

function Loader({ loaded, total }: { loaded: number; total: number }) {
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6">
      <TriangleA className="text-4xl" />
      <div className="h-px w-40 bg-line">
        <span
          className="block h-px bg-accent transition-[width] duration-[--dur-fast]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="t-label text-fg-muted">
        {loaded} / {total}
      </p>
    </div>
  );
}
