import type { Metadata } from "next";

import { AdminSidebar, AdminSignOut } from "@/client/components/admin/AdminNav";
import { requireAdminPage } from "@/server/auth/guards";

export const metadata: Metadata = {
  title: "ZUARY admin",
  robots: { index: false, follow: false },
};

/**
 * Admin shell.
 *
 * Dense on purpose — this is a tool two people open every morning, not a
 * storefront. The motion layer (Lenis, page transitions, the trouser cursor) is
 * switched off for /admin in MotionLayer, because it is mounted in the root
 * layout above this group and cannot be declined from here.
 *
 * The role check is the real gate. Middleware also covers /admin/*, but a
 * matcher change or a rewrite would bypass it silently; this cannot be
 * bypassed while it is what renders the page. It answers 404 rather than 403,
 * matching middleware, so a signed-in customer learns nothing about what exists
 * here.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // requireAdminPage is requireAdmin with the 404 conversion folded in, so the
  // layout and every page under it refuse the same way.
  const admin = await requireAdminPage();

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs tracking-[0.2em] text-accent-ink uppercase">
            ZUARY admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-fg-muted">
            {admin.name ?? admin.email}
          </span>
          <AdminSignOut />
        </div>
      </header>

      <div className="grid md:grid-cols-[11rem_1fr]">
        <aside className="border-b border-line md:min-h-[calc(100vh-45px)] md:border-r md:border-b-0">
          <AdminSidebar />
        </aside>
        <div className="min-w-0 p-4">{children}</div>
      </div>
    </div>
  );
}
