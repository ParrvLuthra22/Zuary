"use client";

import { Menu, Moon, ShoppingBag, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Magnetic } from "@/components/motion/Magnetic";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useCartCount } from "@/stores/cart";
import { useThemeStore } from "@/stores/theme";
import { useUIStore } from "@/stores/ui";

const LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/drops", label: "Drops" },
  { href: "/lookbook", label: "Lookbook" },
  { href: "/about", label: "About" },
];

export function Nav() {
  const pathname = usePathname();
  const count = useCartCount();
  const openCart = useUIStore((s) => s.openCart);
  const mobileNavOpen = useUIStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);

  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-[--dur-fast] ease-[--ease-out]",
          scrolled
            ? "border-b border-line bg-bg/80 backdrop-blur-xl"
            : "border-b border-transparent",
        )}
      >
        <nav className="flex h-16 items-center justify-between px-6 md:px-12">
          <Link href="/" className="t-display-sm !text-xl leading-none">
            ZU
            <span className="mx-[0.06em] inline-block align-[0.06em] text-accent">
              ▲
            </span>
            RY
          </Link>

          <ul className="hidden gap-8 md:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Magnetic strength={5}>
                  <Link
                    href={link.href}
                    className={cn(
                      "t-label transition-colors duration-[--dur-micro]",
                      pathname.startsWith(link.href)
                        ? "text-accent"
                        : "text-fg-muted hover:text-fg",
                    )}
                  >
                    {link.label}
                  </Link>
                </Magnetic>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="text-fg-muted transition-colors hover:text-fg"
            >
              {mounted && theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </button>

            <button
              type="button"
              onClick={openCart}
              aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
              className="relative text-fg-muted transition-colors hover:text-fg"
            >
              <ShoppingBag className="size-4" />
              {mounted && count > 0 ? (
                <span className="absolute -top-2 -right-2 flex size-4 items-center justify-center rounded-full bg-accent font-mono text-[9px] text-carbon">
                  {count}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
              className="text-fg-muted transition-colors hover:text-fg md:hidden"
            >
              <Menu className="size-4" />
            </button>
          </div>
        </nav>
      </header>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="top" className="border-line bg-bg">
          <SheetHeader>
            <SheetTitle className="t-label text-fg-muted">Menu</SheetTitle>
          </SheetHeader>
          <ul className="space-y-2 px-6 pb-10">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="t-display-sm block py-2">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
