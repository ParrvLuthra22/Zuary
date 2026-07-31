"use client";

import { useEffect } from "react";

import { TriangleA } from "@/client/components/layout/Wordmark";
import { ButtonZ } from "@/client/components/ui/button-z";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-carbon px-6 text-center">
      <TriangleA className="text-[8rem] md:text-[11rem]" />
      <h1 className="t-display-lg text-off-white">Something snagged.</h1>
      <p className="max-w-sm text-fg-muted">
        That is on us, not you. Nothing in your bag has been lost.
      </p>
      <ButtonZ onClick={reset}>Try again</ButtonZ>
      {error.digest ? (
        <p className="t-label text-fg-muted">Reference {error.digest}</p>
      ) : null}
    </div>
  );
}
