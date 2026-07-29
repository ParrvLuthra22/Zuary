"use client";

import { AnimatePresence, motion } from "framer-motion";
import type Lenis from "lenis";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Wordmark } from "@/components/layout/Wordmark";
import { useLenis } from "@/components/motion/SmoothScroll";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PRODUCTS } from "@/lib/data/products";
import { dur, easeOut } from "@/lib/motion/easing";
import { cn, formatINR } from "@/lib/utils";
import { useCartCount } from "@/stores/cart";
import { useUIStore } from "@/stores/ui";

/* LOOKBOOK is parked until there is lookbook photography — the route 404s, so
   linking to it would be a dead entry in the primary nav. Put it back between
   DROP and ABOUT when the shoot lands. */
const LINKS = [
  { href: "/shop", label: "SHOP" },
  { href: "/drops", label: "DROP" },
  { href: "/about", label: "ABOUT" },
];

const HIDE_AFTER = 400;
const SOLID_AFTER = 40;
const PER_CHAR_MS = 26;

export function Nav() {
  const pathname = usePathname();
  const lenis = useLenis();
  const count = useCartCount();

  const openCart = useUIStore((s) => s.openCart);
  const mobileNavOpen = useUIStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen);

  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  /* Scroll state comes off Lenis so it stays in step with the smoothed
     position. Without Lenis (reduced motion) fall back to the raw event. */
  useEffect(() => {
    const update = (y: number, direction: number) => {
      setScrolled(y > SOLID_AFTER);
      setHidden(direction > 0 && y > HIDE_AFTER);
    };

    if (lenis) {
      const handler = (instance: Lenis) =>
        update(instance.scroll, instance.direction);
      lenis.on("scroll", handler);
      return () => lenis.off("scroll", handler);
    }

    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      update(y, y > last ? 1 : -1);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lenis]);

  // A route change should never leave the bar hidden or a panel open.
  useEffect(() => {
    setHidden(false);
    setMobileNavOpen(false);
    setSearchOpen(false);
  }, [pathname, setMobileNavOpen]);

  const pinned = hidden && !mobileNavOpen && !searchOpen;

  return (
    <>
      <motion.header
        animate={{ y: pinned ? "-100%" : "0%" }}
        transition={{ duration: dur.fast, ease: [...easeOut] }}
        className={cn(
          "fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-[320ms] ease-[--ease-out]",
          scrolled
            ? "border-line bg-bg/80 backdrop-blur-xl"
            : "border-transparent",
        )}
      >
        <nav className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-5 md:px-10 md:py-6">
          <Link href="/" className="justify-self-start">
            <Wordmark className="t-display-sm !text-xl" />
          </Link>

          <ul className="hidden justify-center gap-8 md:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <NavLink
                  href={link.href}
                  label={link.label}
                  active={pathname.startsWith(link.href)}
                />
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-4 justify-self-end">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="text-fg-muted transition-colors duration-[--dur-micro] hover:text-fg"
            >
              <Search className="size-4" />
            </button>

            <ThemeToggle />

            <button
              type="button"
              onClick={openCart}
              aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
              className="relative text-fg-muted transition-colors duration-[--dur-micro] hover:text-fg"
            >
              <ShoppingBag className="size-4" />
              {mounted && count > 0 ? (
                <span className="absolute -top-2 -right-2 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[9px] leading-4 text-carbon">
                  {count}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
              className="text-fg-muted transition-colors duration-[--dur-micro] hover:text-fg md:hidden"
            >
              <Menu className="size-4" />
            </button>
          </div>
        </nav>
      </motion.header>

      <MobileNav
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        pathname={pathname}
        count={count}
        onCart={openCart}
      />

      <SearchSheet open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

/**
 * Each character gets its own clipping box holding two stacked copies. On hover
 * the stack slides up by exactly one character height, staggered left to right,
 * so the accent-coloured copy takes the original's place.
 */
function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  const chars = useMemo(() => label.split(""), [label]);

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "t-label group relative flex py-1",
        active ? "text-accent-ink" : "text-fg-muted",
      )}
    >
      <span aria-hidden className="flex">
        {chars.map((char, i) => (
          <span
            key={`${char}-${i}`}
            className="block overflow-hidden"
            style={{ height: "1em", lineHeight: 1 }}
          >
            <span
              className="flex flex-col transition-transform ease-[--ease-out] group-hover:-translate-y-[1em]"
              style={{ transitionDuration: "420ms", transitionDelay: `${i * PER_CHAR_MS}ms` }}
            >
              <span style={{ lineHeight: 1 }}>{char}</span>
              <span className="text-accent-ink" style={{ lineHeight: 1 }}>
                {char}
              </span>
            </span>
          </span>
        ))}
      </span>

      {active ? (
        <motion.span
          layoutId="nav-underline"
          className="absolute -bottom-0.5 left-0 h-px w-full bg-accent"
          transition={{ duration: 0.42, ease: [...easeOut] }}
        />
      ) : null}
    </Link>
  );
}

function MobileNav({
  open,
  onOpenChange,
  pathname,
  count,
  onCart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
  count: number;
  onCart: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-line bg-bg sm:max-w-none"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>

        <AnimatePresence>
          {open ? (
            <ul className="flex flex-1 flex-col justify-center gap-2 px-8">
              {LINKS.map((link, i) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: dur.mid,
                    ease: [...easeOut],
                    delay: i * 0.06,
                  }}
                >
                  <Link
                    href={link.href}
                    className={cn(
                      "t-display-sm block py-2",
                      pathname.startsWith(link.href) ? "text-accent-ink" : "text-fg",
                    )}
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
          ) : null}
        </AnimatePresence>

        <div className="flex items-center justify-between border-t border-line px-8 py-6">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onCart();
            }}
            className="t-label flex items-center gap-2 text-fg-muted transition-colors hover:text-fg"
          >
            <ShoppingBag className="size-4" />
            Cart ({count})
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Three products fit in memory, so this filters the catalogue directly rather
 * than shipping a dead control.
 */
function SearchSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PRODUCTS;
    return PRODUCTS.filter((p) =>
      [p.name, p.deva, p.devaMeaning, p.fit, p.fabric, p.mill]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="top" className="border-line bg-bg">
        <SheetHeader>
          <SheetTitle className="t-label text-fg-muted">Search</SheetTitle>
        </SheetHeader>

        <div className="px-6 pb-8">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Trouser, fit, fabric, mill…"
            className="h-12 rounded-sm border-line bg-bg-raised font-mono text-sm"
          />

          <ul className="mt-6 divide-y divide-line border-t border-line">
            {results.map((product) => (
              <li key={product.slug}>
                <Link
                  href={`/products/${product.slug}`}
                  onClick={() => onOpenChange(false)}
                  className="flex items-baseline justify-between gap-4 py-4"
                >
                  <span className="flex items-baseline gap-3">
                    <span className="t-display-sm !text-lg">{product.name}</span>
                    <span className="t-deva text-sm text-fg-muted">
                      {product.deva}
                    </span>
                  </span>
                  <span className="t-label text-fg-muted">
                    {product.fit} · {formatINR(product.price)}
                  </span>
                </Link>
              </li>
            ))}
            {results.length === 0 ? (
              <li className="t-label py-6 text-fg-muted">
                Nothing matches “{query}”.
              </li>
            ) : null}
          </ul>
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close search"
          className="absolute top-4 right-6 text-fg-muted hover:text-fg"
        >
          <X className="size-4" />
        </button>
      </SheetContent>
    </Sheet>
  );
}
