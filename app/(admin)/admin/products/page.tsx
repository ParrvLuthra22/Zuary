import { requireAdminPage } from "@/lib/admin/guard";

/** Placeholder — products management is not built yet. */
export default async function AdminPlaceholderPage() {
  await requireAdminPage();

  return (
    <div className="py-16">
      <h1 className="font-mono text-sm tracking-wide text-fg uppercase">products</h1>
      <p className="mt-3 font-mono text-xs text-fg-muted">Not built yet.</p>
    </div>
  );
}
