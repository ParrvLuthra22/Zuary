import { Column, Row, Section, Text } from "@react-email/components";

import {
  ActionButton,
  BRAND,
  EmailLayout,
  FONT,
  Heading,
  Label,
  Paragraph,
  absolute,
} from "./components/EmailLayout";
import type { OrderEmailAddress } from "./OrderConfirmation";

export type OrderShippedProps = {
  shortId: string;
  orderId: string;
  courier: string;
  awb: string;
  /** Null when the courier gives us no deep link — the AWB then stands alone. */
  trackingUrl?: string | null;
  address: OrderEmailAddress;
};

export function OrderShipped({
  shortId,
  orderId,
  courier,
  awb,
  trackingUrl,
  address,
}: OrderShippedProps) {
  return (
    <EmailLayout preview={`Order ${shortId} has left the building.`}>
      <Heading>On its way.</Heading>
      <Paragraph muted>
        Order {shortId} was handed to the courier today.
      </Paragraph>

      <Section style={{ margin: "28px 0 0" }}>
        <Row>
          <Column>
            <Label>Courier</Label>
            <Text
              style={{
                fontFamily: FONT,
                fontSize: 15,
                color: BRAND.ink,
                margin: 0,
              }}
            >
              {courier}
            </Text>
          </Column>
          <Column>
            <Label>AWB</Label>
            <Text
              style={{
                fontFamily: FONT,
                fontSize: 15,
                color: BRAND.ink,
                margin: 0,
                // The number people read out to support — never let it wrap
                // mid-string on a narrow phone.
                whiteSpace: "nowrap",
              }}
            >
              {awb}
            </Text>
          </Column>
        </Row>
      </Section>

      <Section style={{ margin: "32px 0 8px" }}>
        {trackingUrl ? (
          <ActionButton href={trackingUrl}>Track your parcel</ActionButton>
        ) : (
          /* No deep link from this courier. Rather than a button that goes
             nowhere, the AWB is repeated as text to copy into their site. */
          <Paragraph muted>
            Track with {courier} using AWB <strong>{awb}</strong>.
          </Paragraph>
        )}
      </Section>

      <Section style={{ marginTop: 32 }}>
        <Label>Delivering to</Label>
        <Text
          style={{
            fontFamily: FONT,
            fontSize: 14,
            lineHeight: "21px",
            color: BRAND.muted,
            margin: 0,
          }}
        >
          {address.name}
          <br />
          {address.line1}
          {address.line2 ? (
            <>
              <br />
              {address.line2}
            </>
          ) : null}
          <br />
          {address.city}, {address.state} {address.pincode}
        </Text>
      </Section>

      <Section style={{ marginTop: 28 }}>
        <ActionButton href={absolute(`/account/orders/${orderId}`)}>
          View your order
        </ActionButton>
      </Section>
    </EmailLayout>
  );
}

OrderShipped.PreviewProps = {
  shortId: "A3F91B2C",
  orderId: "00000000-0000-0000-0000-000000000000",
  courier: "Delhivery",
  awb: "1234567890123",
  trackingUrl: "https://www.delhivery.com/track/package/1234567890123",
  address: {
    name: "Parrv Luthra",
    line1: "14 Chamiers Road",
    line2: "Teynampet",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600018",
  },
} satisfies OrderShippedProps;

export default OrderShipped;
