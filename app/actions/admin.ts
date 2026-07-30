"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { COURIER_NAMES, trackingUrlFor } from "@/lib/admin/couriers";
import { NotAdminError, requireAdmin, writeAudit } from "@/lib/admin/guard";
import { db } from "@/lib/db";
import { shortOrderId } from "@/lib/order-number";
import { orders, users } from "@/lib/db/schema";
import { sendOrderCancelled, sendOrderShipped } from "@/lib/email/order-confirmation";

export type AdminResult = { ok: true } | { ok: false; error: string };

function fail(error: unknown): AdminResult {
  if (error instanceof NotAdminError) {
    return { ok: false, error: "Not authorised." };
  }
  console.error("[admin action]", error);
  return { ok: false, error: "That did not work. Try again." };
}

const shipSchema = z.object({
  orderId: z.string().uuid(),
  courier: z.enum(COURIER_NAMES as [string, ...string[]]),
  awb: z.string().trim().min(3, "AWB is required.").max(64),
  trackingUrl: z.string().url().max(500).optional().or(z.literal("")),
});

/**
 * Marks an order shipped, records the courier reference, audits it, and mails
 * the customer.
 *
 * Guarded on `status = 'paid'` in the UPDATE itself. That is what makes a
 * double-submit safe: the second call matches no row, returns undefined, and
 * exits before the email — so nobody gets told twice that the same parcel just
 * left. Checking the status first and updating after would leave a window
 * between the two where both calls pass.
 */
export async function markShippedAction(input: {
  orderId: string;
  courier: string;
  awb: string;
  trackingUrl?: string;
}): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();

    const parsed = shipSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Check the fields.",
      };
    }
    const { orderId, courier, awb } = parsed.data;

    // Rebuild the link server-side. What the browser sent is a convenience, not
    // a fact — and an admin-supplied URL for "Other" is the only case where the
    // submitted value is used.
    const derived = trackingUrlFor(courier, awb);
    const trackingUrl = derived ?? (parsed.data.trackingUrl || null);

    const [row] = await db
      .update(orders)
      .set({
        status: "shipped",
        courier,
        trackingNumber: awb,
        trackingUrl,
        shippedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.status, "paid")))
      .returning();

    if (!row) {
      return {
        ok: false,
        error: "That order is not awaiting shipment — reload the list.",
      };
    }

    await writeAudit({
      actorUserId: admin.id,
      action: "order.ship",
      entity: "order",
      entityId: orderId,
      meta: { courier, awb, trackingUrl },
    });

    // Never blocks the status change: sendEmail cannot throw, and a parcel that
    // shipped without its email is still shipped.
    await sendOrderShipped(orderId);

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function markDeliveredAction(
  orderId: string,
): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();

    const [row] = await db
      .update(orders)
      .set({ status: "delivered", updatedAt: new Date() })
      // Only something already shipped can be delivered.
      .where(and(eq(orders.id, orderId), eq(orders.status, "shipped")))
      .returning();

    if (!row) {
      return { ok: false, error: "That order has not shipped yet." };
    }

    await writeAudit({
      actorUserId: admin.id,
      action: "order.deliver",
      entity: "order",
      entityId: orderId,
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Cancels an order.
 *
 * The typed order number is re-checked here, not just in the dialog. A
 * confirmation the client alone enforces is decoration — this is the
 * destructive action on the page and it starts a refund conversation, so the
 * server insists on the same proof.
 *
 * Stock is deliberately NOT returned here. Whether the units go back on the
 * shelf depends on where the parcel is, and guessing wrong oversells the next
 * customer. B08's returns flow owns that decision.
 */
export async function cancelOrderAction(
  orderId: string,
  typedOrderNumber: string,
): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();

    if (
      typedOrderNumber.trim().toUpperCase() !== shortOrderId(orderId)
    ) {
      return { ok: false, error: "Order number does not match." };
    }

    const [row] = await db
      .update(orders)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    if (!row) return { ok: false, error: "No such order." };

    await writeAudit({
      actorUserId: admin.id,
      action: "order.cancel",
      entity: "order",
      entityId: orderId,
      meta: { previousStatus: row.status, refundInr: row.totalInr },
    });

    await sendOrderCancelled(orderId);

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setEarlyAccessAction(
  userId: string,
  enabled: boolean,
): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();

    const [row] = await db
      .update(users)
      .set({ earlyAccess: enabled })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    if (!row) return { ok: false, error: "No such customer." };

    await writeAudit({
      actorUserId: admin.id,
      action: enabled ? "customer.early_access.grant" : "customer.early_access.revoke",
      entity: "user",
      entityId: userId,
    });

    revalidatePath("/admin/customers");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
