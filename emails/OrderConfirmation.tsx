import { Column, Hr, Img, Row, Section, Text } from "@react-email/components";

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

export type OrderEmailLine = {
  name: string;
  size: string;
  qty: number;
  lineTotal: string;
  /** Path or absolute URL; resolved against the site origin either way. */
  image?: string | null;
};

export type OrderEmailAddress = {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
};

export type OrderConfirmationProps = {
  shortId: string;
  orderId: string;
  placedOn: string;
  lines: OrderEmailLine[];
  subtotal: string;
  shipping: string;
  total: string;
  address: OrderEmailAddress;
};

export function OrderConfirmation({
  shortId,
  orderId,
  placedOn,
  lines,
  subtotal,
  shipping,
  total,
  address,
}: OrderConfirmationProps) {
  return (
    <EmailLayout preview="We've got your order. Here's what's coming.">
      <Heading>Thank you.</Heading>
      <Paragraph muted>
        We&rsquo;ve got your order and payment. Everything below is confirmed.
      </Paragraph>

      <Section style={{ margin: "28px 0 8px" }}>
        <Row>
          <Column>
            <Label>Order</Label>
            <Text
              style={{
                fontFamily: FONT,
                fontSize: 15,
                color: BRAND.ink,
                margin: 0,
              }}
            >
              {shortId}
            </Text>
          </Column>
          <Column>
            <Label>Placed</Label>
            <Text
              style={{
                fontFamily: FONT,
                fontSize: 15,
                color: BRAND.ink,
                margin: 0,
              }}
            >
              {placedOn}
            </Text>
          </Column>
        </Row>
      </Section>

      <Hr
        style={{
          borderColor: BRAND.line,
          borderWidth: "0 0 1px",
          margin: "24px 0",
        }}
      />

      {lines.map((line, i) => (
        <Section key={`${line.name}-${line.size}-${i}`} style={{ marginBottom: 16 }}>
          <Row>
            <Column style={{ width: 64, verticalAlign: "top" }}>
              {line.image ? (
                <Img
                  // Absolute, always. A relative src resolves against the mail
                  // client's own host and silently 404s.
                  src={absolute(line.image)}
                  alt=""
                  width={56}
                  height={70}
                  style={{
                    display: "block",
                    border: `1px solid ${BRAND.line}`,
                    borderRadius: 3,
                    objectFit: "cover",
                  }}
                />
              ) : null}
            </Column>
            <Column style={{ verticalAlign: "top", paddingLeft: 12 }}>
              <Text
                style={{
                  fontFamily: FONT,
                  fontSize: 15,
                  color: BRAND.ink,
                  margin: 0,
                }}
              >
                {line.name}
              </Text>
              <Text
                style={{
                  fontFamily: FONT,
                  fontSize: 13,
                  color: BRAND.muted,
                  margin: "4px 0 0",
                }}
              >
                {line.size} × {line.qty}
              </Text>
            </Column>
            <Column
              style={{
                verticalAlign: "top",
                textAlign: "right",
                whiteSpace: "nowrap",
              }}
            >
              <Text
                style={{
                  fontFamily: FONT,
                  fontSize: 15,
                  color: BRAND.ink,
                  margin: 0,
                }}
              >
                {line.lineTotal}
              </Text>
            </Column>
          </Row>
        </Section>
      ))}

      <Hr
        style={{
          borderColor: BRAND.line,
          borderWidth: "0 0 1px",
          margin: "24px 0",
        }}
      />

      <TotalRow label="Subtotal" value={subtotal} />
      <TotalRow label="Shipping" value={shipping} />
      <TotalRow label="Total" value={total} emphasis />

      <Section style={{ margin: "32px 0 8px" }}>
        <ActionButton href={absolute(`/account/orders/${orderId}`)}>
          View your order
        </ActionButton>
      </Section>

      <Section style={{ marginTop: 32 }}>
        <Label>Shipping to</Label>
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

      <Paragraph muted>Ships within 3 working days.</Paragraph>
    </EmailLayout>
  );
}

function TotalRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <Row style={{ marginBottom: emphasis ? 0 : 6 }}>
      <Column>
        <Text
          style={{
            fontFamily: FONT,
            fontSize: emphasis ? 15 : 14,
            fontWeight: emphasis ? 700 : 400,
            color: emphasis ? BRAND.ink : BRAND.muted,
            margin: 0,
          }}
        >
          {label}
        </Text>
      </Column>
      <Column style={{ textAlign: "right" }}>
        <Text
          style={{
            fontFamily: FONT,
            fontSize: emphasis ? 15 : 14,
            fontWeight: emphasis ? 700 : 400,
            color: BRAND.ink,
            margin: 0,
          }}
        >
          {value}
        </Text>
      </Column>
    </Row>
  );
}

/** Preview fixture for `email dev`. */
OrderConfirmation.PreviewProps = {
  shortId: "A3F91B2C",
  orderId: "00000000-0000-0000-0000-000000000000",
  placedOn: "30 Jul 2026",
  lines: [
    {
      name: "KOHL",
      size: "M",
      qty: 2,
      lineTotal: "₹5,998",
      image: "/products/kohl/01.webp",
    },
    {
      name: "REEH",
      size: "L",
      qty: 1,
      lineTotal: "₹3,299",
      image: "/products/reeh/01.webp",
    },
  ],
  subtotal: "₹9,297",
  shipping: "Free",
  total: "₹9,297",
  address: {
    name: "Parrv Luthra",
    line1: "14 Chamiers Road",
    line2: "Teynampet",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600018",
  },
} satisfies OrderConfirmationProps;

export default OrderConfirmation;
