"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { savedAddressSchema } from "@/lib/checkout";
import {
  createAddress,
  deleteAddress,
  setDefaultAddress,
  updateAddress,
} from "@/lib/db/queries";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Every action here re-reads the session rather than trusting anything passed
 * in. A server action is a public POST endpoint — the userId must come from the
 * cookie, never from the form, or one customer can edit another's addresses by
 * changing a hidden field.
 */
async function requireUserId() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("UNAUTHENTICATED");
  return id;
}

function fail(error: unknown): ActionResult {
  if (error instanceof Error && error.message === "UNAUTHENTICATED") {
    return { ok: false, error: "Your session expired. Sign in again." };
  }
  console.error("[addresses]", error);
  return { ok: false, error: "Could not save that. Try again." };
}

/** Shared parse so create and update cannot validate differently. */
function parse(formData: FormData) {
  const parsed = savedAddressSchema.safeParse({
    label: formData.get("label") ?? "",
    fullName: formData.get("fullName") ?? "",
    phone: formData.get("phone") ?? "",
    line1: formData.get("line1") ?? "",
    line2: formData.get("line2") ?? "",
    city: formData.get("city") ?? "",
    state: formData.get("state") ?? "",
    pincode: formData.get("pincode") ?? "",
    isDefault: formData.get("isDefault") === "on",
  });

  if (parsed.success) return { data: parsed.data };

  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { fieldErrors };
}

export async function createAddressAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const { data, fieldErrors } = parse(formData);
    if (!data) {
      return { ok: false, error: "Check the highlighted fields.", fieldErrors };
    }

    await createAddress({
      userId,
      label: data.label || null,
      fullName: data.fullName,
      phone: data.phone,
      line1: data.line1,
      line2: data.line2 || null,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      isDefault: Boolean(data.isDefault),
    });

    revalidatePath("/account/addresses");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function updateAddressAction(
  addressId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const { data, fieldErrors } = parse(formData);
    if (!data) {
      return { ok: false, error: "Check the highlighted fields.", fieldErrors };
    }

    const row = await updateAddress(addressId, userId, {
      label: data.label || null,
      fullName: data.fullName,
      phone: data.phone,
      line1: data.line1,
      line2: data.line2 || null,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      isDefault: Boolean(data.isDefault),
    });

    // Nothing updated means the row is not this user's, or is gone. Same answer
    // either way — we do not confirm that someone else's id exists.
    if (!row) return { ok: false, error: "That address is no longer there." };

    revalidatePath("/account/addresses");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteAddressAction(
  addressId: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const removed = await deleteAddress(addressId, userId);
    if (!removed) return { ok: false, error: "That address is no longer there." };
    revalidatePath("/account/addresses");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setDefaultAddressAction(
  addressId: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const row = await setDefaultAddress(addressId, userId);
    if (!row) return { ok: false, error: "That address is no longer there." };
    revalidatePath("/account/addresses");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
