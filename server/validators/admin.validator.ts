import "server-only";

import { z } from "zod";

import { COURIER_NAMES } from "@/shared/constants/couriers";

export const shipSchema = z.object({
  orderId: z.string().uuid(),
  courier: z.enum(COURIER_NAMES as [string, ...string[]]),
  awb: z.string().trim().min(3, "AWB is required.").max(64),
  trackingUrl: z.string().url().max(500).optional().or(z.literal("")),
});

export const orderIdSchema = z.string().uuid("No such order.");

export const cancelSchema = z.object({
  orderId: z.string().uuid(),
  /** Typed by the admin as proof of intent; re-checked server-side. */
  confirmOrderNumber: z.string().trim().min(1),
  reason: z.string().trim().max(500).optional(),
});

export const earlyAccessSchema = z.object({
  userId: z.string().min(1),
  enabled: z.boolean(),
});

export const setStockSchema = z.object({
  variantId: z.number().int().positive(),
  qty: z.number().int().min(0).max(9999),
});

export const productSchema = z.object({
  slug: z.string().min(1),
  name: z.string().trim().min(1, "Name is required.").max(60),
  deva: z.string().trim().max(60).optional().or(z.literal("")),
  devaMeaning: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  fabricStory: z.string().trim().max(4000).optional().or(z.literal("")),
  fabric: z.string().trim().max(80).optional().or(z.literal("")),
  weight: z.string().trim().max(40).optional().or(z.literal("")),
  mill: z.string().trim().max(80).optional().or(z.literal("")),
  weave: z.string().trim().max(80).optional().or(z.literal("")),
  shrinkage: z.string().trim().max(80).optional().or(z.literal("")),
  colour: z.string().trim().max(40).optional().or(z.literal("")),
  fit: z.enum(["tailored", "straight", "pleated"]),
  hem: z.enum(["turn-up", "plain"]),
  // A malformed hex renders as transparent, which reads as a broken swatch
  // rather than a bad value — so it is rejected here instead.
  swatch: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Swatch must be a #RRGGBB hex."),
  priceInr: z.coerce.number().int().min(1).max(1_000_000),
  status: z.enum(["available", "coming-soon"]),
  care: z.array(z.string().trim().max(200)).max(12),
});

export const addImageSchema = z.object({
  productSlug: z.string().min(1),
  url: z.string().url().max(1000),
  alt: z.string().trim().max(300),
  blurDataUrl: z.string().max(20_000).nullable().optional(),
});

export const imageAltSchema = z.object({
  imageId: z.string().min(1),
  alt: z.string().trim().max(300),
});

export const reorderImagesSchema = z.object({
  productSlug: z.string().min(1),
  orderedIds: z.array(z.string().min(1)).max(60),
});
