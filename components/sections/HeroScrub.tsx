"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { useUIStore } from "@/stores/ui";

type HeroScrubProps = {
  /** Zero-padded frames at /sequence/<name>/0001.webp … */
  sequence?: string;
  frameCount?: number;
  children?: React.ReactNode;
};

/**
 * Scrubs an image sequence to scroll across a 200vh track. Frames are drawn to
 * a canvas so we never pay for 120 mounted <img> elements. Falls back to the
 * first frame under reduced motion.
 */
export function HeroScrub({
  sequence = "trouser",
  frameCount = 60,
  children,
}: HeroScrubProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const [ready, setReady] = useState(false);
  const reducedMotion = useUIStore((s) => s.reducedMotion);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  const frame = useTransform(scrollYProgress, [0, 1], [0, frameCount - 1]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);

  useEffect(() => {
    let cancelled = false;
    const images: HTMLImageElement[] = [];
    let loaded = 0;

    for (let i = 0; i < frameCount; i += 1) {
      const img = new Image();
      img.src = `/sequence/${sequence}/${String(i + 1).padStart(4, "0")}.webp`;
      img.onload = () => {
        loaded += 1;
        if (!cancelled && loaded === 1) setReady(true);
      };
      // A missing sequence should not wedge the hero — the frame just stays blank.
      img.onerror = () => {
        loaded += 1;
      };
      images.push(img);
    }

    framesRef.current = images;
    return () => {
      cancelled = true;
    };
  }, [sequence, frameCount]);

  useEffect(() => {
    if (!ready) return;

    function draw(index: number) {
      const canvas = canvasRef.current;
      const img = framesRef.current[Math.round(index)];
      if (!canvas || !img?.complete || img.naturalWidth === 0) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      // cover-fit
      const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
    }

    draw(frame.get());
    return frame.on("change", draw);
  }, [ready, frame]);

  return (
    <section
      ref={trackRef}
      className="relative h-[200vh]"
      style={reducedMotion ? { height: "100vh" } : undefined}
    >
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden bg-bg-deep">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        <motion.div
          className="relative z-10 px-6 text-center"
          style={reducedMotion ? undefined : { opacity: textOpacity }}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}
