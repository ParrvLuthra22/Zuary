"use client";

import { Heart, LogOut, MapPin, Package, Shield, User } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type NavAccount = {
  name: string | null;
  email: string | null;
  isAdmin: boolean;
};

const ICON = "text-fg-muted transition-colors duration-[--dur-micro] hover:text-fg";

/**
 * The account control in the nav.
 *
 * `account` is resolved on the server (see NavBar) and passed in, so the
 * signed-in and signed-out states are both correct in the first HTML the browser
 * receives. Deciding this on the client would show every returning customer a
 * "sign in" link for a frame before swapping it.
 */
export function AccountMenu({ account }: { account: NavAccount | null }) {
  if (!account) {
    return (
      <Link href="/login" aria-label="Sign in" className={ICON}>
        <User className="size-4" />
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Account" className={ICON}>
        <User className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          {account.name ? (
            <span className="block font-mono text-xs text-fg">
              {account.name}
            </span>
          ) : null}
          {account.email ? (
            <span className="mt-0.5 block font-mono text-[11px] break-all text-fg-muted">
              {account.email}
            </span>
          ) : null}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/account/orders">
            <Package />
            Orders
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/addresses">
            <MapPin />
            Addresses
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/wishlist">
            <Heart />
            Wishlist
          </Link>
        </DropdownMenuItem>

        {/* Only rendered for admins. The route is gated independently in
            middleware and again in the page — this is a shortcut, not the
            control. */}
        {account.isAdmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-accent-ink focus:text-accent-ink">
              <Link href="/admin">
                <Shield />
                Admin
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={(event) => {
            // Radix would close the menu and unmount mid-navigation otherwise.
            event.preventDefault();
            void signOut({ redirectTo: "/" });
          }}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
