"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Inline sign-in, shown when the session is missing at /checkout.
 *
 * Deliberately not a redirect. Middleware sends signed-out visitors to /login
 * before they ever get here, so the only way to see this is a session that
 * expired with a full cart on screen — and bouncing someone mid-checkout to a
 * bare login page is where carts get abandoned. The bag stays visible beside
 * this, and one tap comes straight back.
 *
 * `redirectTo` is /checkout, so Google returns to exactly this page. The cart
 * survives because it is in localStorage and the page waits for hydration
 * before reading it.
 */
export function CheckoutSignIn() {
  const [pending, setPending] = useState(false);

  return (
    <div className="rounded-sm border border-accent/40 bg-accent/5 p-6">
      <p className="t-label text-accent-ink">Session expired</p>
      <h2 className="t-display-sm mt-3">Sign in to pay.</h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-fg-muted">
        Your bag is still here — nothing has been lost. Sign in and you come
        straight back to this page.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setPending(true);
            void signIn("google", { redirectTo: "/checkout" });
          }}
          className={cn(
            "flex h-12 items-center justify-center gap-3 rounded-sm px-6",
            "font-mono text-xs tracking-[0.18em] uppercase",
            "bg-off-white text-carbon hover:bg-fog",
            "light:border light:border-line light:bg-bg-deep",
            "transition-colors duration-[--dur-micro]",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          <GoogleMark />
          {pending ? "Redirecting…" : "Continue with Google"}
        </button>

        <a
          href="/login?next=%2Fcheckout"
          className="t-label text-accent-ink underline-offset-4 hover:underline"
        >
          Use email instead →
        </a>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.64h6.19a5.3 5.3 0 0 1-2.3 3.47v2.9h3.72c2.17-2 3.45-4.95 3.45-8.56Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.55-2.02-6.46-4.75H1.68v3A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.54 14.67a7.2 7.2 0 0 1 0-4.6v-3H1.68a12 12 0 0 0 0 10.6l3.86-3Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.2.58 4.4 1.72l3.3-3.3C17.72 1.19 15.11 0 12 0 7.35 0 3.33 2.67 1.68 6.57l3.86 3C6.45 6.84 9 4.75 12 4.75Z"
      />
    </svg>
  );
}
