import { Section, Text } from "@react-email/components";

import {
  ActionButton,
  BRAND,
  EmailLayout,
  FONT,
  Heading,
  Paragraph,
} from "./components/EmailLayout";

export type MagicLinkProps = {
  url: string;
  /** The host shown in the copy, so the recipient can sanity-check the link. */
  host: string;
};

export function MagicLink({ url, host }: MagicLinkProps) {
  return (
    <EmailLayout preview="Your ZUARY sign-in link — expires in 24 hours.">
      <Heading>Sign in to ZUARY.</Heading>

      <Paragraph muted>
        Tap the button to sign in to {host}. No password needed.
      </Paragraph>

      <Section style={{ margin: "28px 0" }}>
        <ActionButton href={url}>Sign in</ActionButton>
      </Section>

      {/*
        The raw URL, verbatim.

        Some clients strip buttons, some proxy links, and some people simply do
        not trust one. It is also the only way to sign in from a different
        device. Wrapped with break-all because a magic-link URL is long enough
        to blow out a 560px card otherwise.
      */}
      <Text
        style={{
          fontFamily: FONT,
          fontSize: 12,
          lineHeight: "18px",
          color: BRAND.muted,
          margin: "0 0 8px",
        }}
      >
        Or paste this into your browser:
      </Text>
      <Text
        style={{
          fontFamily: FONT,
          fontSize: 12,
          lineHeight: "18px",
          color: BRAND.muted,
          wordBreak: "break-all",
          margin: "0 0 24px",
        }}
      >
        {url}
      </Text>

      <Paragraph muted>
        This link expires in 24 hours. If you didn&rsquo;t request it, ignore
        this email — nothing will happen.
      </Paragraph>
    </EmailLayout>
  );
}

MagicLink.PreviewProps = {
  url: "https://zuary.in/api/auth/callback/resend?token=preview-token-value&email=you%40example.com",
  host: "zuary.in",
} satisfies MagicLinkProps;

export default MagicLink;
