"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { POLICIES } from "@/lib/data/policies";
import { PRODUCTS } from "@/lib/data/products";

export function Footer() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);

  async function join(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Could not add you. Try again.");
        return;
      }
      setEmail("");
      toast("You are on the list.");
    } catch {
      toast("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <footer className="border-t border-line bg-bg-deep px-6 py-16 md:px-12">
      <div className="grid gap-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="t-display-sm">
            ZU<span className="text-accent">▲</span>RY
          </p>
          <p className="mt-3 max-w-sm text-sm text-fg-muted">
            Trousers cut in fixed runs. Made in Tamil Nadu and Rajasthan.
          </p>

          <form onSubmit={join} className="mt-8 flex max-w-sm gap-2">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email for the next drop"
              aria-label="Email for the next drop"
              className="h-11 rounded-sm border-line bg-bg-raised font-mono text-sm"
            />
            <Button
              type="submit"
              disabled={pending}
              className="h-11 rounded-sm bg-accent font-mono text-[11px] tracking-[0.18em] text-carbon uppercase hover:bg-accent-soft"
            >
              {pending ? "…" : "Join"}
            </Button>
          </form>
        </div>

        <nav>
          <p className="t-label mb-4 text-fg-muted">Shop</p>
          <ul className="space-y-2">
            {PRODUCTS.map((product) => (
              <li key={product.slug}>
                <Link
                  href={`/products/${product.slug}`}
                  className="font-mono text-sm text-fg-muted transition-colors hover:text-fg"
                >
                  {product.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/orders"
                className="font-mono text-sm text-fg-muted transition-colors hover:text-fg"
              >
                Track order
              </Link>
            </li>
          </ul>
        </nav>

        <nav>
          <p className="t-label mb-4 text-fg-muted">Legal</p>
          <ul className="space-y-2">
            {POLICIES.map((policy) => (
              <li key={policy.slug}>
                <Link
                  href={`/about#${policy.slug}`}
                  className="font-mono text-sm text-fg-muted transition-colors hover:text-fg"
                >
                  {policy.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mt-16 flex flex-col justify-between gap-2 border-t border-line pt-6 md:flex-row">
        <p className="t-label text-fg-muted">
          © {new Date().getFullYear()} ZUARY
        </p>
        <p className="t-label text-fg-muted">Cut sharp.</p>
      </div>
    </footer>
  );
}
