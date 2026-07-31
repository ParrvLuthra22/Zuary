import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CopyAddressButton,
  OrderActions,
} from "@/client/components/admin/OrderActions";
import { getOrderForAdmin } from "@/server/db/queries";
import type { OrderStatus } from "@/server/db/schema";
import { shortOrderId } from "@/shared/utils/order-number";
import { cn, formatINR } from "@/shared/utils";
import { requireAdminPage } from "@/server/auth/guards";

const STAMP = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const TIMELINE: { key: OrderStatus; label: string }[] = [
  { key: "created", label: "Placed" },
  { key: "paid", label: "Paid" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Authorisation before any query — see requireAdminPage.
  await requireAdminPage();

  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const order = await getOrderForAdmin(id).catch(() => undefined);
  if (!order) notFound();

  const number = shortOrderId(order.id);
  const a = order.addressJson;

  /* Plain block, newline separated — what a courier's form wants pasted in. */
  const addressText = [
    a.name,
    a.line1,
    a.line2 || null,
    `${a.city}, ${a.state} ${a.pincode}`,
    a.country ?? "India",
    `Phone: ${order.phone}`,
  ]
    .filter(Boolean)
    .join("\n");

  const reached = TIMELINE.findIndex((s) => s.key === order.status);

  return (
    <div className="max-w-5xl">
      <Link
        href="/admin/orders"
        className="font-mono text-[11px] tracking-wide text-fg-muted uppercase hover:text-fg"
      >
        ← Orders
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-lg tracking-wide text-fg">{number}</h1>
          <p className="mt-1 font-mono text-[11px] text-fg-muted">
            {STAMP.format(new Date(order.createdAt))} · {order.status}
          </p>
        </div>
        <OrderActions
          orderId={order.id}
          orderNumber={number}
          status={order.status}
        />
      </div>

      {/* Timeline */}
      {reached !== -1 ? (
        <ol className="mt-6 flex items-center gap-2">
          {TIMELINE.map((step, i) => (
            <li key={step.key} className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full",
                  i <= reached ? "bg-accent" : "bg-line",
                )}
              />
              <span
                className={cn(
                  "font-mono text-[11px] tracking-wide uppercase",
                  i <= reached ? "text-fg" : "text-fg-muted",
                )}
              >
                {step.label}
              </span>
              {i < TIMELINE.length - 1 ? (
                <span
                  className={cn(
                    "h-px w-8",
                    i < reached ? "bg-accent" : "bg-line",
                  )}
                />
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_18rem]">
        <div>
          <Panel title="Items">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  {["SKU", "Product", "Size", "Qty", "Unit", "Line"].map((h) => (
                    <th
                      key={h}
                      className="px-2 py-1.5 font-mono text-[10px] font-normal tracking-[0.15em] text-fg-muted uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-line/50">
                    <td className="px-2 py-1.5 font-mono text-[11px] text-fg-muted">
                      {item.sku ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-xs text-fg uppercase">
                      {item.productSlug}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-xs">{item.size}</td>
                    <td className="px-2 py-1.5 font-mono text-xs">{item.qty}</td>
                    <td className="px-2 py-1.5 font-mono text-xs text-fg-muted">
                      {formatINR(item.unitPriceInr)}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-xs">
                      {formatINR(item.unitPriceInr * item.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <dl className="mt-4 space-y-1 border-t border-line pt-3">
              <Money label="Subtotal" value={order.subtotalInr} />
              <Money label="Shipping" value={order.shippingInr} />
              <Money label="Total" value={order.totalInr} strong />
            </dl>
          </Panel>

          <Panel title="Audit trail">
            {order.audit.length === 0 ? (
              <p className="font-mono text-[11px] text-fg-muted">
                No admin actions yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {order.audit.map((entry) => (
                  <li key={entry.id} className="font-mono text-[11px]">
                    <span className="text-fg">{entry.action}</span>
                    <span className="text-fg-muted">
                      {" · "}
                      {entry.actorName ?? entry.actorEmail ?? "unknown"}
                      {" · "}
                      {STAMP.format(new Date(entry.createdAt))}
                    </span>
                    {entry.meta ? (
                      <span className="block text-fg-muted">
                        {JSON.stringify(entry.meta)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div>
          <Panel title="Customer">
            <p className="font-mono text-xs text-fg">{a.name}</p>
            <p className="mt-1 font-mono text-[11px] break-all text-fg-muted">
              {order.email}
            </p>
            <p className="font-mono text-[11px] text-fg-muted">{order.phone}</p>
            {order.userId ? (
              <Link
                href={`/admin/customers/${order.userId}`}
                className="mt-2 inline-block font-mono text-[11px] text-accent-ink hover:underline"
              >
                Customer history →
              </Link>
            ) : (
              <p className="mt-2 font-mono text-[11px] text-fg-muted">
                Guest order
              </p>
            )}
          </Panel>

          <Panel
            title="Ship to"
            action={<CopyAddressButton text={addressText} />}
          >
            <address className="font-mono text-[11px] leading-relaxed whitespace-pre-line text-fg-muted not-italic">
              {addressText}
            </address>
          </Panel>

          <Panel title="Payment">
            <Field label="Razorpay order" value={order.razorpayOrderId} />
            <Field label="Payment id" value={order.razorpayPaymentId} />
            {order.razorpayPaymentId ? (
              <a
                href={`https://dashboard.razorpay.com/app/payments/${order.razorpayPaymentId}`}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-block font-mono text-[11px] text-accent-ink hover:underline"
              >
                Open in Razorpay →
              </a>
            ) : null}
          </Panel>

          {order.trackingNumber ? (
            <Panel title="Shipment">
              <Field label="Courier" value={order.courier} />
              <Field label="AWB" value={order.trackingNumber} />
              {order.shippedAt ? (
                <Field
                  label="Shipped"
                  value={STAMP.format(new Date(order.shippedAt))}
                />
              ) : null}
              {order.trackingUrl ? (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2 inline-block font-mono text-[11px] text-accent-ink hover:underline"
                >
                  Track →
                </a>
              ) : null}
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4 rounded border border-line p-3">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="font-mono text-[10px] tracking-[0.15em] text-fg-muted uppercase">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <p className="font-mono text-[11px]">
      <span className="text-fg-muted">{label}: </span>
      <span className="break-all text-fg">{value ?? "—"}</span>
    </p>
  );
}

function Money({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between font-mono text-xs">
      <dt className="text-fg-muted">{label}</dt>
      <dd className={strong ? "text-fg" : "text-fg-muted"}>
        {value === 0 && label === "Shipping" ? "Free" : formatINR(value)}
      </dd>
    </div>
  );
}
