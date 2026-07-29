"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { ComingSoonCard } from "@/components/commerce/ComingSoonCard";
import { ProductCard } from "@/components/commerce/ProductCard";
import { TriangleA } from "@/components/layout/Wordmark";
import { ButtonZ } from "@/components/ui/button-z";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SIZES, type Product, type Size } from "@/lib/data/products";
import { dur, easeOut } from "@/lib/motion/easing";
import { cn } from "@/lib/utils";

const CUTS = ["tailored", "straight", "pleated"] as const;
type Cut = (typeof CUTS)[number];

const SORTS = [
  { value: "new", label: "New" },
  { value: "price-asc", label: "Price low→high" },
  { value: "price-desc", label: "Price high→low" },
] as const;
type SortValue = (typeof SORTS)[number]["value"];

const PILL =
  "t-label rounded-none border px-4 py-2 whitespace-nowrap transition-colors duration-[--dur-micro]";

/** Comma-separated multi-value params, e.g. ?cut=tailored,pleated */
const parseList = (raw: string | null) =>
  raw ? raw.split(",").filter(Boolean) : [];

export function ShopBrowser({ products }: { products: Product[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const cuts = parseList(params.get("cut")) as Cut[];
  const sizes = parseList(params.get("size")) as Size[];
  const sort = (params.get("sort") ?? "new") as SortValue;

  /** Writes state to the URL so a filtered view is shareable and Back works. */
  const commit = useCallback(
    (next: { cut?: string[]; size?: string[]; sort?: string }) => {
      const sp = new URLSearchParams(params.toString());
      const set = (key: string, value: string[] | string | undefined) => {
        if (value === undefined) return;
        const joined = Array.isArray(value) ? value.join(",") : value;
        // Defaults stay out of the URL so the clean path is the clean state.
        if (!joined || joined === "new") sp.delete(key);
        else sp.set(key, joined);
      };
      set("cut", next.cut);
      set("size", next.size);
      set("sort", next.sort);
      const qs = sp.toString();
      // push, not replace: each filter change should be its own history entry
      // so the back button steps back through them.
      router.push(qs ? `/shop?${qs}` : "/shop", { scroll: false });
    },
    [params, router],
  );

  const toggle = useCallback(
    (key: "cut" | "size", value: string, current: string[]) => {
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      commit({ [key]: next });
    },
    [commit],
  );

  const { available, comingSoon, visible } = useMemo(() => {
    const matches = (p: Product) => {
      const cutOk = cuts.length === 0 || cuts.includes(p.fit as Cut);
      // A coming-soon trouser has no stock to filter against — the sizes on
      // it are the intended run, not availability. Excluding it from a size
      // filter would hide a cut that will exist in that size.
      const sizeOk =
        p.status === "coming-soon" ||
        sizes.length === 0 ||
        sizes.some((s) => p.sizes.includes(s));
      return cutOk && sizeOk;
    };

    const order = (list: Product[]) => {
      const next = [...list];
      if (sort === "price-asc") next.sort((a, b) => a.price - b.price);
      else if (sort === "price-desc") next.sort((a, b) => b.price - a.price);
      else next.sort((a, b) => a.series - b.series);
      return next;
    };

    const matched = products.filter(matches);
    // Shot trousers lead regardless of sort — a buyable card should never sit
    // below one that cannot be bought.
    const availableList = order(
      matched.filter((p) => p.status === "available"),
    );
    const comingSoonList = order(
      matched.filter((p) => p.status === "coming-soon"),
    );

    return {
      available: availableList,
      comingSoon: comingSoonList,
      visible: [...availableList, ...comingSoonList],
    };
  }, [products, cuts, sizes, sort]);

  const hasFilters = cuts.length > 0 || sizes.length > 0 || sort !== "new";

  const groups = (
    <>
      <Group label="Cut">
        {CUTS.map((cut) => (
          <Pill
            key={cut}
            active={cuts.includes(cut)}
            onClick={() => toggle("cut", cut, cuts)}
          >
            {cut}
          </Pill>
        ))}
      </Group>

      <Group label="Size">
        {SIZES.map((size) => (
          <Pill
            key={size}
            active={sizes.includes(size)}
            onClick={() => toggle("size", size, sizes)}
          >
            {size}
          </Pill>
        ))}
      </Group>

      <Group label="Sort">
        {SORTS.map((option) => (
          <Pill
            key={option.value}
            active={sort === option.value}
            onClick={() => commit({ sort: option.value })}
          >
            {option.label}
          </Pill>
        ))}
      </Group>
    </>
  );

  return (
    <>
      <div className="sticky top-20 z-30 border-y border-line bg-bg/80 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-6 px-6 md:px-12">
          {/* Desktop: every group inline. */}
          <div className="hidden flex-1 flex-wrap items-center gap-x-8 gap-y-3 md:flex">
            {groups}
          </div>

          {/* Mobile: sort scrolls, the rest lives in a sheet. */}
          <div className="flex min-w-0 flex-1 items-center gap-3 md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    PILL,
                    "flex shrink-0 items-center gap-2",
                    hasFilters
                      ? "border-accent bg-accent text-carbon"
                      : "border-line text-fg",
                  )}
                >
                  <SlidersHorizontal className="size-3" />
                  Filter
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="border-line bg-bg">
                <SheetHeader>
                  <SheetTitle className="t-label text-fg-muted">
                    Filter &amp; sort
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-6 px-6 pb-10">{groups}</div>
              </SheetContent>
            </Sheet>

            {/* Edge fades so the row reads as scrollable. */}
            <div
              className="min-w-0 flex-1 overflow-x-auto"
              style={{
                maskImage:
                  "linear-gradient(to right, transparent, black 1.5rem, black calc(100% - 1.5rem), transparent)",
                WebkitMaskImage:
                  "linear-gradient(to right, transparent, black 1.5rem, black calc(100% - 1.5rem), transparent)",
              }}
            >
              <div className="flex gap-2 px-6">
                {SORTS.map((option) => (
                  <Pill
                    key={option.value}
                    active={sort === option.value}
                    onClick={() => commit({ sort: option.value })}
                  >
                    {option.label}
                  </Pill>
                ))}
              </div>
            </div>
          </div>

          <p className="t-label shrink-0 text-fg-muted">
            {available.length} available
            {comingSoon.length > 0 ? (
              <> · {comingSoon.length} coming soon</>
            ) : null}
          </p>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-5 px-6 py-32 text-center">
          <TriangleA className="text-4xl" />
          <p className="t-display-sm">Nothing matches.</p>
          <ButtonZ variant="outline" onClick={() => router.push("/shop")}>
            Clear filters
          </ButtonZ>
        </div>
      ) : (
        <motion.ul
          layout
          className="grid grid-cols-1 gap-x-6 gap-y-16 px-6 py-16 sm:grid-cols-2 md:px-12 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {visible.map((product, i) => (
              <motion.li
                key={product.slug}
                layout
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{
                  duration: dur.mid,
                  ease: [...easeOut],
                  delay: i * 0.08,
                }}
              >
                {product.status === "available" ? (
                  <ProductCard product={product} priority={i === 0} />
                ) : (
                  <ComingSoonCard product={product} />
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="t-label mr-1 text-fg-muted">{label}</span>
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        PILL,
        active
          ? "border-accent bg-accent text-carbon"
          : "border-line text-fg hover:border-fg-muted",
      )}
    >
      {children}
    </button>
  );
}
