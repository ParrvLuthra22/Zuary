"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/server/auth/guards";
import { parseInput } from "@/server/http";
import {
  addAddress,
  deleteAddress,
  editAddress,
  setDefaultAddress,
} from "@/server/services/addresses.service";
import { savedAddressSchema } from "@/shared/validators/checkout";
import { fail, ok, type ActionResult } from "./result";

/**
 * Every action re-reads the session through requireUser rather than trusting
 * anything passed in. A server action is a public POST endpoint — the userId
 * must come from the cookie, never from the form, or one customer can edit
 * another's addresses by changing a hidden field.
 */

export type AddressResult = ActionResult;

/** Shared read so create and update cannot validate differently. */
function fromForm(formData: FormData) {
  return parseInput(savedAddressSchema, {
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
}

export async function createAddressAction(
  formData: FormData,
): Promise<AddressResult> {
  try {
    const user = await requireUser();
    await addAddress(user.id, fromForm(formData));
    revalidatePath("/account/addresses");
    return ok();
  } catch (error) {
    return fail(error, "addresses/create");
  }
}

export async function updateAddressAction(
  addressId: string,
  formData: FormData,
): Promise<AddressResult> {
  try {
    const user = await requireUser();
    await editAddress(addressId, user.id, fromForm(formData));
    revalidatePath("/account/addresses");
    return ok();
  } catch (error) {
    return fail(error, "addresses/update");
  }
}

export async function deleteAddressAction(
  addressId: string,
): Promise<AddressResult> {
  try {
    const user = await requireUser();
    await deleteAddress(addressId, user.id);
    revalidatePath("/account/addresses");
    return ok();
  } catch (error) {
    return fail(error, "addresses/delete");
  }
}

export async function setDefaultAddressAction(
  addressId: string,
): Promise<AddressResult> {
  try {
    const user = await requireUser();
    await setDefaultAddress(addressId, user.id);
    revalidatePath("/account/addresses");
    return ok();
  } catch (error) {
    return fail(error, "addresses/setDefault");
  }
}
