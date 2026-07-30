import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

/**
 * The shell every ZUARY email sits in.
 *
 * Three rules this file exists to enforce:
 *
 * 1. No web fonts. Outlook, Gmail's web client and most Android clients ignore
 *    @font-face, and the fallback is whatever the client picks — so the stack is
 *    Helvetica/Arial and the design is built for it. Inter Tight only appears
 *    here as the wordmark PNG.
 * 2. No CSS the wordmark depends on. The site draws its triangle with clip-path,
 *    which no email client renders; it ships as a hosted image instead.
 * 3. Absolute URLs everywhere. An email has no origin, so every href and src has
 *    to carry the full host.
 */

export const BRAND = {
  bg: "#F4F5F3",
  card: "#FFFFFF",
  ink: "#101010",
  muted: "#6A7075",
  line: "#E4E5E2",
  accent: "#FF6B35",
} as const;

export const FONT =
  'Helvetica Neue, Helvetica, Arial, "Liberation Sans", sans-serif';

/** Absolute origin. Emails have no relative base to resolve against. */
export function emailOrigin() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://zuary.in"
  );
}

export const absolute = (path: string) =>
  path.startsWith("http") ? path : `${emailOrigin()}${path}`;

export function EmailLayout({
  preview,
  children,
  /**
   * Marketing mail must carry an unsubscribe link; transactional mail must not.
   * An order confirmation with an unsubscribe row invites people to opt out of
   * the receipts they are legally owed, and lands the whole domain in the
   * promotions tab. Defaults to transactional — the safer of the two.
   */
  unsubscribeUrl,
}: {
  preview: string;
  children: React.ReactNode;
  unsubscribeUrl?: string;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: BRAND.bg,
          margin: 0,
          padding: "32px 12px",
          fontFamily: FONT,
        }}
      >
        <Container
          style={{
            backgroundColor: BRAND.card,
            maxWidth: 560,
            margin: "0 auto",
            padding: "40px 32px",
            borderRadius: 4,
          }}
        >
          <Section style={{ paddingBottom: 8 }}>
            <Link href={absolute("/")}>
              <Img
                src={absolute("/email/wordmark.png")}
                alt="ZUARY"
                width={140}
                // Height fixed too: a client that blocks images still reserves
                // the right box, so the layout does not jump when they load.
                height={33}
                style={{ display: "block", border: 0 }}
              />
            </Link>
          </Section>

          <Hr
            style={{
              borderColor: BRAND.accent,
              borderWidth: "0 0 2px",
              margin: "20px 0 32px",
            }}
          />

          {children}

          <Hr
            style={{
              borderColor: BRAND.line,
              borderWidth: "0 0 1px",
              margin: "40px 0 24px",
            }}
          />

          <Text
            style={{
              fontFamily: FONT,
              fontSize: 12,
              lineHeight: "18px",
              color: BRAND.muted,
              margin: 0,
            }}
          >
            ZUARY · Made in India
          </Text>
          <Text
            style={{
              fontFamily: FONT,
              fontSize: 12,
              lineHeight: "18px",
              color: BRAND.muted,
              margin: "6px 0 0",
            }}
          >
            <Link
              href={absolute("/account/orders")}
              style={{ color: BRAND.muted, textDecoration: "underline" }}
            >
              Your orders
            </Link>
            {unsubscribeUrl ? (
              <>
                {"  ·  "}
                <Link
                  href={unsubscribeUrl}
                  style={{ color: BRAND.muted, textDecoration: "underline" }}
                >
                  Unsubscribe
                </Link>
              </>
            ) : null}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/* ── Shared bits, so five templates cannot drift ─────────────── */

export function Heading({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: FONT,
        fontSize: 28,
        lineHeight: "34px",
        fontWeight: 700,
        letterSpacing: "-0.5px",
        color: BRAND.ink,
        margin: "0 0 16px",
      }}
    >
      {children}
    </Text>
  );
}

export function Paragraph({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <Text
      style={{
        fontFamily: FONT,
        fontSize: 15,
        lineHeight: "23px",
        color: muted ? BRAND.muted : BRAND.ink,
        margin: "0 0 16px",
      }}
    >
      {children}
    </Text>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: FONT,
        fontSize: 11,
        lineHeight: "16px",
        letterSpacing: "1.5px",
        textTransform: "uppercase",
        color: BRAND.muted,
        margin: "0 0 6px",
      }}
    >
      {children}
    </Text>
  );
}

/**
 * A table-based button, not a styled <a>.
 *
 * Outlook ignores padding on inline elements, which collapses a padded anchor
 * to a text link. React Email's Button renders the table wrapper that Outlook
 * does honour.
 */
export function ActionButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <table cellPadding={0} cellSpacing={0} role="presentation">
      <tbody>
        <tr>
          <td
            style={{
              backgroundColor: BRAND.accent,
              borderRadius: 4,
            }}
          >
            <Link
              href={href}
              style={{
                display: "inline-block",
                padding: "14px 28px",
                fontFamily: FONT,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: "#101010",
                textDecoration: "none",
              }}
            >
              {children}
            </Link>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
