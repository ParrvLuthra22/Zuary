"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/server/auth/guards";
import { parseInput } from "@/server/http";
import { setEarlyAccess } from "@/server/services/admin.service";
import { sendOrderCancelled, sendOrderShipped } from "@/server/services/email.service";
import {
  cancelOrder,
  markDelivered,
  markShipped,
} from "@/server/services/orders.service";
import {
  cancelSchema,
  earlyAccessSchema,
  orderIdSchema,
  shipSchema,
} from "@/server/validators/admin.validator";
import { fail, ok, type ActionResult } from "./result";

/**
 * Admin order actions.
 *
 * Each one is the same five steps: guard, parse, call the service, revalidate,
 * return. All the rules — what may ship, what a double-submit does, what gets
 * audited — live in orders.service, so an API route could do this in the same
 * five lines.
 */

export type AdminResult = ActionResult;

export async function markShippedAction(input: unknown): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const { orderId, courier, awb, trackingUrl } = parseInput(shipSchema, input);

    await markShipped({
      orderId,
      courier,
      awb,
      trackingUrl: trackingUrl || null,
      actorUserId: admin.id,
    });

    // After the status change, never able to block it: sendEmail cannot throw,
    // and a parcel that shipped without its email is still shipped.
    await sendOrderShipped(orderId);

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return ok();
  } catch (error) {
    return fail(error, "admin/markShipped");
  }
}

export async function markDeliveredAction(input: unknown): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const orderId = parseInput(orderIdSchema, input);

    await markDelivered({ orderId, actorUserId: admin.id });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return ok();
  } catch (error) {
    return fail(error, "admin/markDelivered");
  }
}

export async function cancelOrderAction(
  orderId: string,
  typedOrderNumber: string,
): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const input = parseInput(cancelSchema, {
      orderId,
      confirmOrderNumber: typedOrderNumber,
    });

    await cancelOrder({
      orderId: input.orderId,
      actorUserId: admin.id,
      confirmOrderNumber: input.confirmOrderNumber,
    });

    await sendOrderCancelled(input.orderId);

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${input.orderId}`);
    return ok();
  } catch (error) {
    return fail(error, "admin/cancelOrder");
  }
}

export async function setEarlyAccessAction(
  userId: string,
  enabled: boolean,
): Promise<AdminResult> {
  try {
    const admin = await requireAdmin();
    const input = parseInput(earlyAccessSchema, { userId, enabled });

    await setEarlyAccess({ ...input, actorUserId: admin.id });

    revalidatePath("/admin/customers");
    return ok();
  } catch (error) {
    return fail(error, "admin/setEarlyAccess");
  }
}
