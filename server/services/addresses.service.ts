import "server-only";

import {
  createAddress,
  deleteAddress as removeAddress,
  listAddresses,
  setDefaultAddress as markDefault,
  updateAddress,
} from "@/server/db/queries";
import type { ShippingAddress } from "@/server/db/schema";
import { NotFoundError } from "@/shared/errors";

/**
 * The address book.
 *
 * Every mutation takes a userId and every underlying query scopes on it in the
 * WHERE clause, so "not yours" and "does not exist" are the same outcome — the
 * row simply does not match. That is why each of these throws NotFoundError on
 * an empty result rather than checking ownership separately: there is nothing
 * to check, because a row belonging to someone else was never returned.
 */

export type AddressInput = {
  label?: string | null;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
};

export function getAddresses(userId: string) {
  return listAddresses(userId);
}

export function addAddress(userId: string, input: AddressInput) {
  return createAddress({
    userId,
    label: input.label || null,
    fullName: input.fullName,
    phone: input.phone,
    line1: input.line1,
    line2: input.line2 || null,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
    isDefault: Boolean(input.isDefault),
  });
}

export async function editAddress(
  addressId: string,
  userId: string,
  input: AddressInput,
) {
  const row = await updateAddress(addressId, userId, {
    label: input.label || null,
    fullName: input.fullName,
    phone: input.phone,
    line1: input.line1,
    line2: input.line2 || null,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
    isDefault: Boolean(input.isDefault),
  });
  if (!row) throw new NotFoundError("That address is no longer there.");
  return row;
}

export async function deleteAddress(addressId: string, userId: string) {
  const removed = await removeAddress(addressId, userId);
  if (!removed) throw new NotFoundError("That address is no longer there.");
  return removed;
}

export async function setDefaultAddress(addressId: string, userId: string) {
  const row = await markDefault(addressId, userId);
  if (!row) throw new NotFoundError("That address is no longer there.");
  return row;
}

/**
 * Saves a checkout address to the account, if it is not already there.
 *
 * Best-effort by contract, and the try/catch is the contract: this runs after
 * an order is written, and a customer who cannot save an address must still be
 * able to pay. It returns a boolean rather than throwing so a caller cannot
 * accidentally make it fatal.
 *
 * Same street and PIN counts as the same address — re-entering it at checkout
 * should not quietly grow a list of near-duplicates.
 */
export async function saveAddressIfNew(
  userId: string,
  address: ShippingAddress,
  phone: string,
): Promise<boolean> {
  try {
    const existing = await listAddresses(userId);
    const duplicate = existing.some(
      (row) =>
        row.line1.trim().toLowerCase() === address.line1.trim().toLowerCase() &&
        row.pincode === address.pincode,
    );
    if (duplicate) return false;

    await createAddress({
      userId,
      label: null,
      fullName: address.name,
      phone,
      line1: address.line1,
      line2: address.line2 || null,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      isDefault: false,
    });
    return true;
  } catch (error) {
    console.error("[addresses.saveAddressIfNew]", error);
    return false;
  }
}
