import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { NotAdminError, requireAdmin } from "@/server/auth/guard";

export const runtime = "nodejs";

const ALLOWED = ["image/webp", "image/jpeg", "image/png"];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Issues a one-shot client upload token.
 *
 * The upload goes browser → Blob directly, never through this server. That is
 * not an optimisation: a Vercel serverless function caps its request body at
 * 4.5 MB, so routing a 5 MB image through a server action fails with an opaque
 * 413 that looks like a broken form.
 *
 * This route is therefore the only checkpoint. It must verify the admin session
 * before issuing a token, because a token is a licence to write to our bucket —
 * an unauthenticated caller getting one is an open file host.
 */
export async function POST(request: Request) {
  /*
   * The gate runs before handleUpload, not inside onBeforeGenerateToken.
   *
   * Throwing from that callback works — no token is issued — but handleUpload
   * wraps the error, so `instanceof NotAdminError` no longer matches and the
   * caller gets a 400 that reads like a malformed request. Checking first means
   * an unauthenticated caller gets an honest 401.
   */
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof NotAdminError) {
      return NextResponse.json({ error: "Not authorised." }, { status: 401 });
    }
    throw error;
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
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
        // The productImages row is written by the client via a server action
        // once it has generated the blur placeholder. Nothing to do here — but
        // the callback is required by handleUpload.
      },
    });

    return NextResponse.json(json);
  } catch (error) {
    if (error instanceof NotAdminError) {
      return NextResponse.json({ error: "Not authorised." }, { status: 401 });
    }
    console.error("[blob-token]", error);
    return NextResponse.json(
      { error: "Could not start the upload." },
      { status: 400 },
    );
  }
}
