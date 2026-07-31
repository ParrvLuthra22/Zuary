import { redirect } from "next/navigation";

import { requireAdminPage } from "@/server/auth/guard";

/** Orders is the working queue, so /admin opens straight into it. */
export default async function AdminIndexPage() {
  // Guarded even though it only redirects — the destination guards too, but a
  // redirect that fires before any check still confirms the route exists.
  await requireAdminPage();
  redirect("/admin/orders");
}
