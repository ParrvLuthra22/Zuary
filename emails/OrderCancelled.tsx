import { Column, Hr, Row, Section, Text } from "@react-email/components";

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
import type { OrderEmailLine } from "./OrderConfirmation";

export type OrderCancelledProps = {
  shortId: string;
  orderId: string;
  lines: OrderEmailLine[];
  refundTotal: string;
};

export function OrderCancelled({
  shortId,
  orderId,
  lines,
  refundTotal,
}: OrderCancelledProps) {
  return (
    <EmailLayout preview={`Order ${shortId} has been cancelled.`}>
      <Heading>Order cancelled.</Heading>
      <Paragraph muted>
        Order {shortId} has been cancelled and nothing will ship.
      </Paragraph>

      <Hr
        style={{
          borderColor: BRAND.line,
          borderWidth: "0 0 1px",
          margin: "24px 0",
        }}
      />

      <Label>Cancelled</Label>
      {lines.map((line, i) => (
        <Row key={`${line.name}-${line.size}-${i}`} style={{ marginBottom: 6 }}>
          <Column>
            <Text
              style={{
                fontFamily: FONT,
                fontSize: 14,
                color: BRAND.ink,
                margin: 0,
              }}
            >
              {line.name}{" "}
              <span style={{ color: BRAND.muted }}>
                {line.size} × {line.qty}
              </span>
            </Text>
          </Column>
          <Column style={{ textAlign: "right" }}>
            <Text
              style={{
                fontFamily: FONT,
                fontSize: 14,
                color: BRAND.muted,
                margin: 0,
              }}
            >
              {line.lineTotal}
            </Text>
          </Column>
        </Row>
      ))}

      <Hr
        style={{
          borderColor: BRAND.line,
          borderWidth: "0 0 1px",
          margin: "24px 0",
        }}
      />

      <Row>
        <Column>
          <Text
            style={{
              fontFamily: FONT,
              fontSize: 15,
              fontWeight: 700,
              color: BRAND.ink,
              margin: 0,
            }}
          >
            Refund
          </Text>
        </Column>
        <Column style={{ textAlign: "right" }}>
          <Text
            style={{
              fontFamily: FONT,
              fontSize: 15,
              fontWeight: 700,
              color: BRAND.ink,
              margin: 0,
            }}
          >
            {refundTotal}
          </Text>
        </Column>
      </Row>

      <Paragraph muted>
        Refunds reach your account in 5&ndash;7 working days. It goes back to
        the method you paid with — we cannot send it anywhere else.
      </Paragraph>

      <Section style={{ marginTop: 24 }}>
        <ActionButton href={absolute(`/account/orders/${orderId}`)}>
          View your order
        </ActionButton>
      </Section>
    </EmailLayout>
  );
}

OrderCancelled.PreviewProps = {
  shortId: "A3F91B2C",
  orderId: "00000000-0000-0000-0000-000000000000",
  lines: [
    { name: "KOHL", size: "M", qty: 2, lineTotal: "₹5,998" },
    { name: "REEH", size: "L", qty: 1, lineTotal: "₹3,299" },
  ],
  refundTotal: "₹9,297",
} satisfies OrderCancelledProps;

export default OrderCancelled;
