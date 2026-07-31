import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/server/auth/guards";
import { route } from "@/server/http";

export const runtime = "nodejs";

const ALLOWED = ["image/webp", "image/jpeg", "image/png"];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Issues a one-shot client upload token.
 *
 * The upload goes browser → Blob directly, never through this server. Not an
 * optimisation: a Vercel serverless function caps its request body at 4.5 MB,
 * so routing a 5 MB image through a server action fails with an opaque 413 that
 * looks like a broken form.
 *
 * This route is therefore the only checkpoint, and a token is a licence to
 * write to our bucket — an unauthenticated caller getting one is an open file
 * host.
 *
 * The gate runs before handleUpload, not inside onBeforeGenerateToken.
 * Throwing from that callback works — no token is issued — but handleUpload
 * wraps the error, so the type is lost and the caller gets a 400 that reads
 * like a malformed request instead of an honest 403.
 */
export const POST = route("admin/blob-token", async (request: Request) => {
  await requireAdmin();

  const body = (await request.json()) as HandleUploadBody;

  const json = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async () => {
      // Re-checked here too: handleUpload calls this when minting the token,
      // and the two are far enough apart to be worth not assuming.
      await requireAdmin();
      return {
        allowedContentTypes: ALLOWED,
        maximumSizeInBytes: MAX_BYTES,
        addRandomSuffix: true,
      };
    },
    onUploadCompleted: async () => {
      // The productImages row is written by the client via a server action once
      // it has generated the blur placeholder. Nothing to do here — but the
      // callback is required by handleUpload.
    },
  });

  return NextResponse.json(json);
});
