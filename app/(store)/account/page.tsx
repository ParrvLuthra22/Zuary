import { redirect } from "next/navigation";

/** /account has no content of its own — orders is the landing view. */
export default function AccountPage() {
  redirect("/account/orders");
}
