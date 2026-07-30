import { Section } from "@react-email/components";

import {
  ActionButton,
  EmailLayout,
  Heading,
  Paragraph,
  absolute,
} from "./components/EmailLayout";

export type WaitlistWelcomeProps = {
  /** Named when they signed up from a specific trouser's notify drawer. */
  productName?: string | null;
  /** Marketing mail, so this is required — see EmailLayout. */
  unsubscribeUrl: string;
};

export function WaitlistWelcome({
  productName,
  unsubscribeUrl,
}: WaitlistWelcomeProps) {
  return (
    <EmailLayout
      preview="You're on the list. We'll write when it lands."
      // The one template that carries an unsubscribe link: this is the only
      // marketing mail of the five.
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading>You&rsquo;re on the list.</Heading>

      <Paragraph muted>
        {productName
          ? `We'll write to you the day ${productName} lands — nothing before that.`
          : "We'll write when the next run opens — nothing before that."}
      </Paragraph>

      <Paragraph muted>
        We run fixed batches, so drops are small and they do sell out. You will
        hear from us first, and only about that. No weekly newsletter.
      </Paragraph>

      <Section style={{ margin: "32px 0 8px" }}>
        <ActionButton href={absolute("/shop")}>
          See what&rsquo;s live
        </ActionButton>
      </Section>
    </EmailLayout>
  );
}

WaitlistWelcome.PreviewProps = {
  productName: "KOHL",
  unsubscribeUrl: "https://zuary.in/unsubscribe?token=preview",
} satisfies WaitlistWelcomeProps;

export default WaitlistWelcome;
