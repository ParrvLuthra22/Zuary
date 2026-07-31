"use client";

import { upload } from "@vercel/blob/client";
import { GripVertical, Lock, Trash2, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addBlobImageAction,
  deleteImageAction,
  reorderImagesAction,
  updateImageAltAction,
} from "@/server/actions/catalogue.actions";
import { cn } from "@/shared/utils";

export type ManagedImage = {
  id: string;
  url: string;
  alt: string;
  source: "static" | "blob";
  sortOrder: number;
};

const MAX_BYTES = 5 * 1024 * 1024;
const WARN_BYTES = 250 * 1024;
const ACCEPT = ["image/webp", "image/jpeg", "image/png"];

/**
 * Draws the image to a 10px canvas and reads the data URL back out.
 *
 * Done in the browser because the file never touches our server — a client
 * upload goes straight to Blob, so this is the only place the pixels exist
 * before they leave. 10px matches the LQIP frames the launch photography
 * shipped with, so uploaded images blur in identically.
 */
async function makeBlurDataUrl(file: File): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const w = 10;
    const h = Math.max(1, Math.round((bitmap.height / bitmap.width) * w));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    return canvas.toDataURL("image/jpeg", 0.6);
  } catch {
    // A missing placeholder is cosmetic; never fail an upload over it.
    return null;
  }
}

export function ImageManager({
  productSlug,
  initial,
}: {
  productSlug: string;
  initial: ManagedImage[];
}) {
  const [images, setImages] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function persistOrder(next: ManagedImage[]) {
    setImages(next);
    startTransition(async () => {
      const result = await reorderImagesAction(
        productSlug,
        next.map((i) => i.id),
      );
      if (!result.ok) toast(result.error);
    });
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const from = images.findIndex((i) => i.id === dragId);
    const to = images.findIndex((i) => i.id === targetId);
    if (from === -1 || to === -1) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    persistOrder(next);
    setDragId(null);
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);

    for (const file of Array.from(files)) {
      if (!ACCEPT.includes(file.type)) {
        toast(`${file.name}: only webp, jpg or png.`);
        continue;
      }
      // Checked here as well as in the token route. The route is the gate that
      // matters; this one exists so a 6MB file fails instantly with a readable
      // message instead of after a long upload.
      if (file.size > MAX_BYTES) {
        toast(
          `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is 5MB.`,
        );
        continue;
      }

      try {
        const blur = await makeBlurDataUrl(file);

        const blob = await upload(
          `products/${productSlug}/${Date.now()}-${file.name}`,
          file,
          {
            access: "public",
            handleUploadUrl: "/api/admin/blob-token",
            contentType: file.type,
          },
        );

        const result = await addBlobImageAction({
          productSlug,
          url: blob.url,
          alt: "",
          blurDataUrl: blur,
        });

        if (!result.ok) {
          toast(result.error);
          continue;
        }

        setImages((current) => [
          ...current,
          {
            id: `pending-${blob.url}`,
            url: blob.url,
            alt: "",
            source: "blob" as const,
            sortOrder: current.length,
          },
        ]);

        if (file.size > WARN_BYTES) {
          toast(
            `${file.name} is ${Math.round(file.size / 1024)}KB — compress it at squoosh.app.`,
            { duration: 8000 },
          );
        }
      } catch (error) {
        console.error("[upload]", error);
        toast(`${file.name}: upload failed.`);
      }
    }

    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-mono text-[10px] tracking-[0.15em] text-fg-muted uppercase">
          Images ({images.length})
        </h2>
        <span className="font-mono text-[10px] text-fg-muted">
          Drag to reorder
        </span>
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image) => (
          <li
            key={image.id}
            draggable
            onDragStart={() => setDragId(image.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(image.id)}
            onDragEnd={() => setDragId(null)}
            className={cn(
              "rounded border border-line bg-bg-raised/40 p-2",
              dragId === image.id && "opacity-50",
            )}
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded bg-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.alt}
                className="h-full w-full object-cover"
              />
              <span className="absolute top-1 left-1 rounded bg-bg-deep/80 px-1.5 py-0.5">
                <GripVertical className="size-3 text-fg-muted" />
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="t-label text-fg-muted">{image.source}</span>

              {image.source === "blob" ? (
                <button
                  type="button"
                  onClick={() => {
                    startTransition(async () => {
                      const result = await deleteImageAction(image.id);
                      if (result.ok) {
                        setImages((c) => c.filter((i) => i.id !== image.id));
                        toast("Image deleted.");
                      } else {
                        toast(result.error);
                      }
                    });
                  }}
                  aria-label="Delete image"
                  className="text-fg-muted hover:text-accent-ink"
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : (
                <span
                  // Explains rather than hides: a disabled control with no
                  // reason reads as a bug.
                  title="This file is committed to the repository and served from /public. It can be reordered here, but deleting the row would not delete the file — and the next seed would restore it. Remove it from git instead."
                  className="cursor-help text-fg-muted"
                >
                  <Lock className="size-3.5" />
                </span>
              )}
            </div>

            <input
              defaultValue={image.alt}
              placeholder="Alt text"
              aria-label={`Alt text for image ${image.sortOrder + 1}`}
              onBlur={(e) => {
                const next = e.target.value;
                if (next === image.alt) return;
                startTransition(async () => {
                  const result = await updateImageAltAction(image.id, next);
                  toast(result.ok ? "Alt saved." : result.error);
                });
              }}
              className="mt-1.5 h-7 w-full rounded border border-line bg-bg px-1.5 font-mono text-[11px] text-fg outline-none focus:border-accent"
            />
          </li>
        ))}
      </ul>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleFiles(e.dataTransfer.files);
        }}
        className="mt-4 rounded border border-dashed border-line p-6 text-center"
      >
        <Upload className="mx-auto size-4 text-fg-muted" />
        <p className="mt-2 font-mono text-[11px] text-fg-muted">
          Drop images here, or{" "}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-accent-ink underline-offset-2 hover:underline"
          >
            choose files
          </button>
        </p>
        <p className="mt-1 font-mono text-[10px] text-fg-muted">
          webp, jpg, png · max 5MB · keep under 250KB
        </p>
        {busy ? (
          <p className="mt-2 font-mono text-[11px] text-accent-ink">
            Uploading…
          </p>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPT.join(",")}
          onChange={(e) => void handleFiles(e.target.files)}
          className="sr-only"
        />
      </div>
    </div>
  );
}
