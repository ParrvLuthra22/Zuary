"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useUIStore } from "@/stores/ui";

type CursorState = "default" | "cta" | "image" | "text";

/** Routes that get the larger cursor. */
const TALL_ROUTES = ["/drops", "/lookbook", "/about"];

const TEXT_INPUT_TYPES = new Set([
  "text",
  "email",
  "tel",
  "search",
  "url",
  "password",
  "number",
  "",
]);

const LERP = 0.2;
const ANCESTOR_DEPTH = 4;

function isTextTarget(el: Element) {
  if (el.matches('[data-cursor="text"]')) return true;
  if (el.tagName === "TEXTAREA") return true;
  if (el.matches('[contenteditable="true"]')) return true;
  if (el.tagName === "INPUT") {
    const type = (el as HTMLInputElement).type.toLowerCase();
    return TEXT_INPUT_TYPES.has(type);
  }
  return false;
}

function isCtaTarget(el: Element) {
  return el.matches('[data-cursor="cta"], a, button, [role="button"]');
}

function isImageTarget(el: Element) {
  return el.matches('[data-cursor="image"], img');
}

/** Walks up from the hit element, nearest first, and returns the first match. */
function resolveState(x: number, y: number): CursorState {
  let el = document.elementFromPoint(x, y);
  for (let depth = 0; el && depth < ANCESTOR_DEPTH; depth += 1) {
    if (isTextTarget(el)) return "text";
    if (isCtaTarget(el)) return "cta";
    if (isImageTarget(el)) return "image";
    el = el.parentElement;
  }
  return "default";
}

/**
 * A trouser-shaped cursor that trails the pointer.
 *
 * Position is written straight to the DOM from a rAF loop — putting it in React
 * state would re-render on every frame. Scale, rotation and opacity live in
 * React because they only change when the hover state does, and they are
 * animated by a CSS transition on a *separate* inner element: a transition on
 * the same node the rAF loop writes to would fight it and produce the jitter
 * this design is trying to avoid.
 */
export function TrouserCursor() {
  const pathname = usePathname();
  const reducedMotion = useUIStore((s) => s.reducedMotion);

  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<CursorState>("default");
  const [visible, setVisible] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: -100, y: -100 });
  const pos = useRef({ x: -100, y: -100 });
  const stateRef = useRef<CursorState>("default");
  const visibleRef = useRef(false);

  const tall = TALL_ROUTES.some((route) => pathname.startsWith(route));
  const height = tall ? 32 : 24;
  const baseOpacity = tall ? 0.9 : 0.65;

  useEffect(() => {
    setEnabled(window.matchMedia("(pointer: fine)").matches);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    function show() {
      if (visibleRef.current) return;
      visibleRef.current = true;
      setVisible(true);
    }

    function hide() {
      if (!visibleRef.current) return;
      visibleRef.current = false;
      setVisible(false);
    }

    function onMove(event: MouseEvent) {
      target.current.x = event.clientX;
      target.current.y = event.clientY;
      show();
    }

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", hide);
    document.addEventListener("mouseenter", show);
    window.addEventListener("blur", hide);

    let raf = 0;
    let frame = 0;

    const loop = () => {
      const { x: tx, y: ty } = target.current;

      if (reducedMotion) {
        pos.current.x = tx;
        pos.current.y = ty;
      } else {
        pos.current.x += (tx - pos.current.x) * LERP;
        pos.current.y += (ty - pos.current.y) * LERP;
      }

      const node = wrapRef.current;
      if (node) {
        node.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      }

      // Hit-testing every frame is wasted work; every other frame is enough.
      frame += 1;
      if (frame % 2 === 0 && visibleRef.current) {
        const next = resolveState(tx, ty);
        if (next !== stateRef.current) {
          stateRef.current = next;
          setState(next);
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", hide);
      document.removeEventListener("mouseenter", show);
      window.removeEventListener("blur", hide);
    };
  }, [enabled, reducedMotion]);

  if (!enabled) return null;

  // Reduced motion: a plain dot that snaps. The cursor:none rule in globals.css
  // is scoped to `prefers-reduced-motion: no-preference`, so the native cursor
  // is still there underneath it.
  if (reducedMotion) {
    return (
      <div
        ref={wrapRef}
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[9999]"
        style={{ willChange: "transform" }}
      >
        <span
          className="block rounded-full bg-accent"
          style={{
            width: 7,
            height: 7,
            transform: "translate(-50%, -50%)",
            opacity: visible ? baseOpacity : 0,
          }}
        />
      </div>
    );
  }

  const visuals: Record<
    CursorState,
    { scale: number; rotate: number; opacity: number; color: string }
  > = {
    default: {
      scale: 1,
      rotate: 0,
      opacity: baseOpacity,
      color: "var(--accent)",
    },
    cta: {
      scale: 1.45,
      rotate: -8,
      opacity: 1,
      color: "var(--hazard-soft)",
    },
    image: { scale: 0.65, rotate: 0, opacity: 0.45, color: "var(--accent)" },
    text: { scale: 0.4, rotate: 0, opacity: 0, color: "var(--accent)" },
  };

  const v = visuals[state];

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[9999]"
      style={{ willChange: "transform" }}
    >
      <div
        style={{
          transformOrigin: "50% 50%",
          transform: `translate(-50%, -50%) scale(${v.scale}) rotate(${v.rotate}deg)`,
          opacity: visible ? v.opacity : 0,
          color: v.color,
          transition:
            "transform 220ms var(--ease-out), opacity 220ms var(--ease-out), color 220ms var(--ease-out)",
        }}
      >
        <svg
          viewBox="0 0 24 34"
          height={height}
          width={(height * 24) / 34}
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="4" y="1.5" width="16" height="3.5" rx="0.5" />
          <path d="M4 5 L11.2 5 L10.2 32 L6.2 32 Z" />
          <path d="M12.8 5 L20 5 L17.8 32 L13.8 32 Z" />
        </svg>
      </div>
    </div>
  );
}
