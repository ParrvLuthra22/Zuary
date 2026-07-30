import { render } from "@react-email/components";
import { Resend } from "resend";

export type SendResult = { ok: boolean; id?: string; error?: string };

/** From address. Must be on a domain verified in Resend or delivery is silent. */
function from() {
  return process.env.EMAIL_FROM ?? "ZUARY <hello@zuary.in>";
}

let client: Resend | undefined;
function resend() {
  const key = process.env.AUTH_RESEND_KEY ?? process.env.RESEND_API_KEY;
  if (!key) return undefined;
  client ??= new Resend(key);
  return client;
}

/**
 * The single way this app sends mail.
 *
 * Two contracts, both load-bearing:
 *
 * 1. It never throws. Every caller is on a path where something more important
 *    already happened — a payment settled, an account was created — and an SMTP
 *    hiccup must not turn that into a 500 or roll anything back. Failures are
 *    logged and returned as `{ ok: false }`.
 * 2. With no API key it renders and logs instead of sending, so the whole flow
 *    is exercisable in development without a Resend account and without
 *    accidentally mailing a real address from a laptop.
 */
export async function sendEmail({
  to,
  subject,
  react,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  replyTo?: string;
}): Promise<SendResult> {
  try {
    const service = resend();

    if (!service) {
      // Rendering here rather than skipping it is deliberate: it is what catches
      // a template that throws, which would otherwise only surface in production.
      const html = await render(react);
      console.info(
        `[email] no API key — not sending.\n  to: ${Array.isArray(to) ? to.join(", ") : to}\n  subject: ${subject}\n  html: ${html.length} bytes`,
      );
      if (process.env.EMAIL_DEBUG_HTML === "true") console.info(html);
      return { ok: true };
    }

    const { data, error } = await service.emails.send({
      from: from(),
      to,
      subject,
      react,
      ...(replyTo ? { replyTo } : {}),
    });

    if (error) {
      console.error("[email] send failed", subject, error);
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data?.id };
  } catch (error) {
    console.error("[email] send threw", subject, error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "unknown",
    };
  }
}
