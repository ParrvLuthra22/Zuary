import { WaitlistTable } from "@/components/admin/WaitlistTable";
import { listWaitlistForAdmin } from "@/lib/db/admin-queries";
import { requireAdminPage } from "@/lib/admin/guard";

export default async function AdminWaitlistPage() {
  // Authorisation before any query — see requireAdminPage.
  await requireAdminPage();

  let rows;
  try {
    rows = await listWaitlistForAdmin();
  } catch (error) {
    console.error("[admin/waitlist]", error);
    return (
      <div className="py-16">
        <p className="font-mono text-sm text-fg">Could not load the waitlist.</p>
        <p className="mt-2 font-mono text-xs text-fg-muted">
          The database is unreachable.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-4 font-mono text-sm tracking-wide text-fg uppercase">
        Waitlist
      </h1>
      <WaitlistTable rows={rows} />
    </>
  );
}
