"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { loadGsap, useCinematic } from "@/components/drops/useCinematic";

export function ChapterMaterial() {
  const { cinematic } = useCinematic();
  const sectionRef = useRef<HTMLElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!cinematic) return;
    const section = sectionRef.current;
    if (!section) return;

    let disposed = false;
    let revert: (() => void) | undefined;

    (async () => {
      const { gsap, ScrollTrigger } = await loadGsap();
      if (disposed) return;

      const ctx = gsap.context(() => {
        const media = section.querySelector<HTMLElement>("[data-material-media]");

        const trigger = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: "+=100%",
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (!media) return;
            const p = self.progress;
            media.style.filter = `grayscale(${1 - p})`;
            media.style.scale = String(1.15 - 0.15 * p);
          },
        });

        ScrollTrigger.refresh();
        return () => trigger.kill();
      }, section);

      revert = () => ctx.revert();
    })();

    return () => {
      disposed = true;
      revert?.();
    };
  }, [cinematic]);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-svh items-center justify-center overflow-hidden bg-carbon"
    >
      <div
        data-material-media
        className="absolute inset-0 will-change-[filter,transform]"
        // Static path holds the end state rather than the grey opener.
        style={cinematic ? { filter: "grayscale(1)", scale: "1.15" } : undefined}
      >
        {!failed ? (
          <Image
            src="/material/weave.webp"
            alt=""
            aria-hidden
            fill
            loading="lazy"
            sizes="100vw"
            className="object-cover"
            onError={() => setFailed(true)}
          />
        ) : null}
      </div>

      <p className="t-display-xl relative z-10 text-off-white mix-blend-difference">
        280 GSM.
      </p>
    </section>
  );
}
