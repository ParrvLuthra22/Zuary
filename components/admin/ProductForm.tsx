"use client";

import { Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { saveProductAction } from "@/app/actions/admin-catalogue";
import type { products } from "@/lib/db/schema";

type Row = typeof products.$inferSelect;

const INPUT =
  "h-9 w-full rounded border border-line bg-bg px-2.5 font-mono text-xs text-fg outline-none focus:border-accent";
const AREA =
  "w-full rounded border border-line bg-bg px-2.5 py-2 font-mono text-xs leading-relaxed text-fg outline-none focus:border-accent";

function Label({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block font-mono text-[10px] tracking-[0.15em] text-fg-muted uppercase"
    >
      {children}
    </label>
  );
}

export function ProductForm({ row }: { row: Row }) {
  const [pending, startTransition] = useTransition();
  const [care, setCare] = useState<string[]>(row.care ?? []);
  const [swatch, setSwatch] = useState(row.swatch ?? "#262626");

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await saveProductAction({
        slug: row.slug,
        name: formData.get("name"),
        deva: formData.get("deva"),
        devaMeaning: formData.get("devaMeaning"),
        description: formData.get("description"),
        fabricStory: formData.get("fabricStory"),
        fabric: formData.get("fabric"),
        weight: formData.get("weight"),
        mill: formData.get("mill"),
        weave: formData.get("weave"),
        shrinkage: formData.get("shrinkage"),
        colour: formData.get("colour"),
        fit: formData.get("fit"),
        hem: formData.get("hem"),
        swatch,
        priceInr: formData.get("priceInr"),
        status: formData.get("status"),
        care,
      });
      toast(result.ok ? "Saved." : result.error);
    });
  }

  return (
    <form action={onSubmit} className="max-w-3xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Name</Label>
          <input id="name" name="name" defaultValue={row.name} className={INPUT} />
        </div>
        <div>
          <Label htmlFor="priceInr">Price (₹)</Label>
          <input
            id="priceInr"
            name="priceInr"
            type="number"
            inputMode="numeric"
            defaultValue={row.priceInr}
            className={INPUT}
          />
        </div>
        <div>
          <Label htmlFor="deva">Devanagari</Label>
          <input id="deva" name="deva" defaultValue={row.deva ?? ""} className={INPUT} />
        </div>
        <div>
          <Label htmlFor="devaMeaning">Meaning</Label>
          <input
            id="devaMeaning"
            name="devaMeaning"
            defaultValue={row.devaMeaning ?? ""}
            className={INPUT}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={row.description ?? ""}
          className={AREA}
        />
      </div>

      <div>
        <Label htmlFor="fabricStory">Fabric story</Label>
        <textarea
          id="fabricStory"
          name="fabricStory"
          rows={6}
          defaultValue={row.fabricStory ?? ""}
          className={AREA}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["fabric", "Fabric", row.fabric],
          ["weight", "Weight", row.weight],
          ["mill", "Mill", row.mill],
          ["weave", "Weave", row.weave],
          ["shrinkage", "Shrinkage", row.shrinkage],
          ["colour", "Colour name", row.colour],
        ].map(([name, label, value]) => (
          <div key={name as string}>
            <Label htmlFor={name as string}>{label as string}</Label>
            <input
              id={name as string}
              name={name as string}
              defaultValue={(value as string) ?? ""}
              className={INPUT}
            />
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <Label htmlFor="fit">Fit</Label>
          <select id="fit" name="fit" defaultValue={row.fit ?? "tailored"} className={INPUT}>
            {["tailored", "straight", "pleated"].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="hem">Hem</Label>
          <select id="hem" name="hem" defaultValue={row.hem ?? "plain"} className={INPUT}>
            {["turn-up", "plain"].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={row.status ?? "available"}
            className={INPUT}
          >
            {["available", "coming-soon"].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="swatch">Swatch</Label>
          <div className="flex items-center gap-2">
            {/* Colour input and hex field share state, so either can drive it —
                the picker is faster, the hex is what gets pasted from a sample. */}
            <input
              type="color"
              value={swatch}
              onChange={(e) => setSwatch(e.target.value)}
              aria-label="Swatch colour"
              className="h-9 w-9 shrink-0 rounded border border-line bg-bg"
            />
            <input
              id="swatch"
              value={swatch}
              onChange={(e) => setSwatch(e.target.value)}
              className={INPUT}
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="care-0">Care instructions</Label>
        <div className="space-y-2">
          {care.map((line, i) => (
            <div key={i} className="flex gap-2">
              <input
                id={`care-${i}`}
                value={line}
                onChange={(e) =>
                  setCare((c) => c.map((v, j) => (j === i ? e.target.value : v)))
                }
                className={INPUT}
              />
              <button
                type="button"
                onClick={() => setCare((c) => c.filter((_, j) => j !== i))}
                aria-label={`Remove care line ${i + 1}`}
                className="shrink-0 rounded border border-line px-2 text-fg-muted hover:border-accent hover:text-accent-ink"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setCare((c) => [...c, ""])}
            className="inline-flex items-center gap-1.5 rounded border border-line px-2.5 py-1.5 font-mono text-[11px] tracking-wide text-fg-muted uppercase hover:text-fg"
          >
            <Plus className="size-3" />
            Add line
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-line pt-4">
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded bg-accent px-5 font-mono text-xs tracking-wide text-carbon uppercase disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save product"}
        </button>
        <span className="font-mono text-[11px] text-fg-muted">
          Publishes to the storefront on save.
        </span>
      </div>
    </form>
  );
}
