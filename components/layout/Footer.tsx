"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { TriangleA, Wordmark } from "@/components/layout/Wordmark";
import { Input } from "@/components/ui/input";
import { currentDrop } from "@/lib/data/drops";
import { PRODUCTS } from "@/lib/data/products";

type Status = "idle" | "pending" | "done" | "error";

const SHOP_LINKS = [
  { href: "/products", label: "All trousers" },
  ...PRODUCTS.map((p) => ({ href: `/products/${p.slug}`, label: p.name })),
  { href: "/drops", label: currentDrop.title },
];

const HELP_LINKS = [
  { href: "/about#shipping", label: "Shipping" },
  { href: "/about#returns", label: "Returns" },
  { href: "/about#sizing", label: "Size guide" },
  { href: "mailto:hello@zuary.in", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-bg-deep py-20">
      {/* Row 1 — oversized mark, full-bleed and cut off at the bottom edge.
          With line-height 1 the baseline sits ~0.8em down, so the negative
          margin has to clear that before it bites into the letterforms. */}
      <div className="overflow-hidden" aria-hidden>
        <Wordmark
          className="font-display -mb-[0.3em] flex w-full justify-center font-black whitespace-nowrap text-fg/8"
          triangleClassName="bg-current"
          style={{ fontSize: "clamp(4rem, 14vw, 11rem)", letterSpacing: "-0.04em" }}
        />
      </div>

      <div className="grid gap-12 px-6 pt-16 md:grid-cols-4 md:px-10">
        <div>
          <p className="t-display-sm">Cut sharp.</p>
          <div className="my-5 h-px w-12 bg-accent" />
          <p className="t-label text-fg-muted">Made in India</p>
        </div>

        <FooterNav heading="Shop" links={SHOP_LINKS} />
        <FooterNav heading="Help" links={HELP_LINKS} />

        <Newsletter />
      </div>

      <div className="mt-16 flex flex-col items-start gap-3 border-t border-line px-6 pt-6 md:flex-row md:items-center md:justify-between md:px-10">
        <p className="t-label text-fg-muted">
          © {new Date().getFullYear()} ZUARY
        </p>
        <div className="flex items-center gap-6">
          <Link href="/about#terms" className="t-label text-fg-muted hover:text-fg">
            Terms
          </Link>
          <Link
            href="/about#privacy"
            className="t-label text-fg-muted hover:text-fg"
          >
            Privacy
          </Link>
          <TriangleA className="text-[10px]" />
        </div>
      </div>
    </footer>
  );
}

function FooterNav({
  heading,
  links,
}: {
  heading: string;
  links: { href: string; label: string }[];
}) {
  return (
    <nav>
      <p className="t-label mb-5 text-fg-muted">{heading}</p>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="font-mono text-sm text-fg-muted transition-colors duration-[--dur-micro] hover:text-fg"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("pending");
    setError("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });

      // The endpoint has no database behind it yet, so it can answer with a
      // non-JSON body. Parsing must never be what breaks the page.
      const data = await res.json().catch(() => ({}) as { error?: string });

      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "Could not add you just yet. Try again later.");
        return;
      }

      setEmail("");
      setStatus("done");
    } catch {
      setStatus("error");
      setError("Network error. Try again.");
    }
  }

  return (
    <div>
      <p className="t-label mb-5 text-fg-muted">The next drop</p>

      {status === "done" ? (
        <p className="font-mono text-sm text-accent">You&rsquo;re on the list.</p>
      ) : (
        <form onSubmit={submit} className="flex gap-2">
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            aria-label="Email for the next drop"
            className="h-11 rounded-sm border-line bg-bg-raised font-mono text-sm"
          />
          <button
            type="submit"
            disabled={status === "pending"}
            aria-label="Join the list"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-sm bg-accent text-carbon transition-colors hover:bg-accent-soft disabled:opacity-50"
          >
            <ArrowRight className="size-4" />
          </button>
        </form>
      )}

      {status === "error" ? (
        <p className="t-label mt-3 text-fg-muted">{error}</p>
      ) : null}

      <div className="mt-6 flex items-center gap-4">
        <a
          href="https://instagram.com/zuary"
          target="_blank"
          rel="noreferrer noopener"
          aria-label="ZUARY on Instagram"
          className="text-fg-muted transition-colors hover:text-fg"
        >
          <InstagramIcon />
        </a>
        <a
          href="https://x.com/zuary"
          target="_blank"
          rel="noreferrer noopener"
          aria-label="ZUARY on X"
          className="text-fg-muted transition-colors hover:text-fg"
        >
          <XIcon />
        </a>
      </div>
    </div>
  );
}

/* lucide v1 dropped brand marks, so these two are inline. */

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
