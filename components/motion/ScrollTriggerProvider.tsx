"use client";

import { useEffect } from "react";

let registered = false;

export function ScrollTriggerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    // Loaded after mount so GSAP stays out of the entry bundle. Anything that
    // needs ScrollTrigger creates its own triggers later than this anyway.
    (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (disposed) return;

      if (!registered) {
        gsap.registerPlugin(ScrollTrigger);
        registered = true;
      }

      // Pinned sections measure themselves on mount; a resize invalidates every
      // one of those measurements, so recompute once the resize settles.
      let timer: ReturnType<typeof setTimeout>;
      const onResize = () => {
        clearTimeout(timer);
        timer = setTimeout(() => ScrollTrigger.refresh(), 200);
      };

      window.addEventListener("resize", onResize);

      // Web fonts change text metrics, so measurements taken before they land
      // are wrong. Only refresh while the page is still at the top: Lenis owns
      // the scroll position, and a refresh after the visitor has moved yanks
      // them somewhere else.
      document.fonts?.ready.then(() => {
        if (disposed || window.scrollY > 4) return;
        ScrollTrigger.refresh();
      });

      cleanup = () => {
        clearTimeout(timer);
        window.removeEventListener("resize", onResize);
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return <>{children}</>;
}
