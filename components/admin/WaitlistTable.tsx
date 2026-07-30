"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export type WaitlistRow = {
  id: number;
  email: string;
  source: string;
  productSlug: string | null;
  size: string | null;
  createdAt: Date;
};

/**
 * Escapes one CSV field.
 *
 * Quotes anything containing a comma, quote or newline, and doubles inner
 * quotes — the RFC 4180 rules Excel actually follows. The leading-character
 * guard is separate and more important: a value starting with = + - or @ is
 * treated as a formula by Excel and Sheets, so `=cmd|...` in a signup field
 * becomes code execution on the machine of whoever opens the export. Prefixing
 * a tab neutralises it while still showing the original text.
 */
function csvField(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const guarded = /^[=+\-@\t\r]/.test(raw) ? `\t${raw}` : raw;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

export function WaitlistTable({ rows }: { rows: WaitlistRow[] }) {
  const [source, setSource] = useState<string>("all");

  const sources = useMemo(
    () => ["all", ...Array.from(new Set(rows.map((r) => r.source))).sort()],
    [rows],
  );

  const visible = useMemo(
    () => (source === "all" ? rows : rows.filter((r) => r.source === source)),
    [rows, source],
  );

  function exportCsv() {
    const header = ["Email", "Source", "Product", "Size", "Date"];
    const body = visible.map((r) => [
      r.email,
      r.source,
      r.productSlug ?? "",
      r.size ?? "",
      new Date(r.createdAt).toISOString(),
    ]);

    /*
     * CRLF line endings and a UTF-8 BOM.
     *
     * Without the BOM, Excel on Windows opens a UTF-8 CSV as its local
     * codepage: ₹ becomes â‚¹ and any non-ASCII name is mangled. The BOM is the
     * only signal Excel reliably reads. CRLF is what it expects too.
     */
    const csv =
      "﻿" +
      [header, ...body].map((row) => row.map(csvField).join(",")).join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `zuary-waitlist-${source}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Revoking immediately can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] text-fg-muted">Source</span>
        {sources.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSource(s)}
            className={cn(
              "rounded border px-2.5 py-1 font-mono text-[11px] tracking-wide uppercase",
              source === s
                ? "border-accent bg-accent text-carbon"
                : "border-line text-fg-muted hover:text-fg",
            )}
          >
            {s}
          </button>
        ))}

        <button
          type="button"
          onClick={exportCsv}
          disabled={visible.length === 0}
          className="ml-auto rounded border border-line px-2.5 py-1 font-mono text-[11px] tracking-wide text-fg uppercase hover:border-accent hover:text-accent-ink disabled:opacity-40"
        >
          Export CSV ({visible.length})
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center font-mono text-xs text-fg-muted">
          Nothing here.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-y border-line">
                {["Email", "Source", "Product", "Size", "Date"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-2 py-2 font-mono text-[10px] font-normal tracking-[0.15em] text-fg-muted uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-line/60 hover:bg-bg-raised/40"
                >
                  <td className="px-2 py-2 font-mono text-xs break-all text-fg">
                    {row.email}
                  </td>
                  <td className="px-2 py-2 font-mono text-[11px] text-fg-muted">
                    {row.source}
                  </td>
                  <td className="px-2 py-2 font-mono text-[11px] text-fg-muted uppercase">
                    {row.productSlug ?? "—"}
                  </td>
                  <td className="px-2 py-2 font-mono text-[11px] text-fg-muted">
                    {row.size ?? "—"}
                  </td>
                  <td className="px-2 py-2 font-mono text-[11px] whitespace-nowrap text-fg-muted">
                    {DATE.format(new Date(row.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
