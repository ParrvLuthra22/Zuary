import type { Metadata } from "next";
import Link from "next/link";

import { TriangleA } from "@/client/components/layout/Wordmark";
import { ButtonZ } from "@/client/components/ui/button-z";

export const metadata: Metadata = {
  title: "Not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-carbon px-6 text-center">
      <TriangleA className="text-[10rem] md:text-[14rem]" />
      <h1 className="t-display-lg text-off-white">Lost the cut.</h1>
      <p className="max-w-sm text-fg-muted">
        That page does not exist, or the run it belonged to has sold out.
      </p>
      <ButtonZ asChild variant="outline">
        <Link href="/">Back home</Link>
      </ButtonZ>
    </div>
  );
}
