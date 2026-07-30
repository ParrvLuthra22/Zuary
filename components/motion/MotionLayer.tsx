"use client";

import { usePathname } from "next/navigation";

import { PageTransition } from "@/components/motion/PageTransition";
import { ScrollTriggerProvider } from "@/components/motion/ScrollTriggerProvider";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { TrouserCursor } from "@/components/motion/TrouserCursor";

/**
 * The storefront's motion layer, and the switch that turns it off for /admin.
 *
 * This has to live here rather than in the route groups. SmoothScroll,
 * PageTransition and TrouserCursor are mounted in the ROOT layout, which sits
 * above every group — so an (admin) layout cannot opt out by simply not
 * rendering them. It has to be decided at the level that owns them.
 *
 * Admin is a tool people use every morning: Lenis fighting the native scroll
 * over a 50-row table, a page fade between order screens, and a hidden cursor
 * are all actively in the way. Admin gets plain scroll, plain navigation and
 * the system cursor.
 */
export function MotionLayer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdmin) {
    return (
      /* data-cursor="text" restores the native cursor: globals.css hides it via
         `html { cursor: none }` on fine pointers, and the [data-cursor="text"]
         rule is what puts it back. Applied to the wrapper so it inherits over
         the whole admin tree. */
      <main id="main" tabIndex={-1} data-cursor="text" className="cursor-auto">
        {children}
      </main>
    );
  }

  return (
    <>
      <SmoothScroll>
        <ScrollTriggerProvider>
          <PageTransition>
            <main id="main" tabIndex={-1}>
              {children}
            </main>
          </PageTransition>
        </ScrollTriggerProvider>
      </SmoothScroll>
      <TrouserCursor />
    </>
  );
}
