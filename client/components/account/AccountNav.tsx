"use client";

import { Heart, LogOut, MapPin, Package } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import { cn } from "@/shared/utils";

const LINKS = [
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
];

/**
 * Sidebar on desktop, a scrollable tab row on mobile.
 *
 * One component for both: the same list, re-laid-out by breakpoint. Rendering
 * two versions would put every item in the DOM twice and let the active state
 * drift between them.
 */
export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Account"
      className={cn(
        // Mobile: a horizontal rail that scrolls, with edge fades so it reads
        // as scrollable. Desktop: a plain vertical column.
        "-mx-6 overflow-x-auto px-6 md:mx-0 md:overflow-visible md:px-0",
      )}
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 1.5rem, black calc(100% - 1.5rem), transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 1.5rem, black calc(100% - 1.5rem), transparent)",
      }}
    >
      <ul className="flex gap-1 md:flex-col md:gap-0">
        {LINKS.map((link) => {
          const active = pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "t-label flex items-center gap-2.5 py-3 whitespace-nowrap transition-colors duration-[--dur-micro]",
                  // The left rule is the desktop active marker. On mobile it
                  // would sit sideways under a horizontal row, so it is only
                  // drawn from md up and the row uses colour alone.
                  "px-4 md:border-l md:pl-4",
                  active
                    ? "text-accent-ink md:border-accent"
                    : "text-fg-muted hover:text-fg md:border-line",
                )}
              >
                <Icon className="size-3.5" />
                {link.label}
              </Link>
            </li>
          );
        })}

        <li className="shrink-0">
          <button
            type="button"
            onClick={() => void signOut({ redirectTo: "/" })}
            className={cn(
              "t-label flex w-full items-center gap-2.5 py-3 whitespace-nowrap",
              "px-4 text-fg-muted transition-colors duration-[--dur-micro] hover:text-fg",
              "md:border-l md:border-line md:pl-4",
            )}
          >
            <LogOut className="size-3.5" />
            Sign out
          </button>
        </li>
      </ul>
    </nav>
  );
}
