"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/waitlist", label: "Waitlist" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="p-3">
      <ul className="space-y-0.5">
        {LINKS.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded px-3 py-2 font-mono text-xs tracking-wide uppercase",
                  active
                    ? "bg-bg-raised text-accent-ink"
                    : "text-fg-muted hover:bg-bg-raised/60 hover:text-fg",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AdminSignOut() {
  return (
    <button
      type="button"
      onClick={() => void signOut({ redirectTo: "/" })}
      className="rounded border border-line px-3 py-1.5 font-mono text-xs tracking-wide text-fg-muted uppercase transition-colors hover:border-fg-muted hover:text-fg"
    >
      Sign out
    </button>
  );
}
