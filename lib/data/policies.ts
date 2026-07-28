export type Policy = {
  slug: string;
  title: string;
  summary: string;
  updatedAt: string; // ISO date
  sections: { heading: string; body: string[] }[];
};

export const SHIPPING_FLAT_INR = 99;
export const FREE_SHIPPING_THRESHOLD_INR = 2000;

/** Shipping is free once the basket clears the threshold. */
export const shippingFor = (subtotalInr: number) =>
  subtotalInr >= FREE_SHIPPING_THRESHOLD_INR ? 0 : SHIPPING_FLAT_INR;

export const RETURN_WINDOW_DAYS = 7;
export const DISPATCH_DAYS = 3;

export const POLICIES: Policy[] = [
  {
    slug: "shipping",
    title: "Shipping",
    summary:
      "Free over ₹2,000, ₹99 below. Dispatched within three working days, India only.",
    updatedAt: "2026-07-01",
    sections: [
      {
        heading: "Where we ship",
        body: [
          "Every state and union territory in India. We do not ship outside the country yet — customs and returns for a three-product brand are not worth doing badly.",
        ],
      },
      {
        heading: "What it costs",
        body: [
          "Free on orders over ₹2,000. Below that, a flat ₹99 anywhere in India.",
          "Prices include GST. There is nothing added at checkout that you have not already seen.",
        ],
      },
      {
        heading: "How long it takes",
        body: [
          "Dispatched within three working days of payment clearing.",
          "Metro addresses: three to five working days after dispatch. Everywhere else: five to eight.",
          "A tracking link goes out by email the moment the parcel leaves the warehouse.",
        ],
      },
      {
        heading: "If something goes wrong",
        body: [
          "If tracking has not moved in five working days, write to hello@zuary.in and we will chase the courier ourselves rather than ask you to.",
        ],
      },
    ],
  },
  {
    slug: "returns",
    title: "Returns & exchanges",
    summary:
      "Seven days from delivery. One free size exchange per order. Refunds to the original payment method.",
    updatedAt: "2026-07-01",
    sections: [
      {
        heading: "The window",
        body: [
          "Seven days from the day the parcel is delivered. Unworn, unwashed, tags still on.",
          "Try them on indoors, over socks. That is enough to know.",
        ],
      },
      {
        heading: "Size exchanges",
        body: [
          "One free size exchange per order, subject to stock. We collect the first pair and send the replacement together, so you are not out of pocket twice.",
        ],
      },
      {
        heading: "Refunds",
        body: [
          "Back to the original payment method within seven working days of the parcel reaching us. Razorpay handles the reversal; how quickly it lands depends on your bank.",
          "Shipping is not refunded on a change of mind. It is refunded in full if the fault is ours.",
        ],
      },
      {
        heading: "What we cannot take back",
        body: [
          "Altered hems. Anything washed. Anything without tags. Those are not judgement calls, they are just not resellable.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy",
    summary:
      "We collect what an order needs and nothing else. Card details never reach our servers.",
    updatedAt: "2026-07-01",
    sections: [
      {
        heading: "What we collect",
        body: [
          "Name, email, phone and shipping address at checkout. An email address if you join the waitlist.",
          "Payment details go directly to Razorpay. They never touch our servers, and we could not read them if we wanted to.",
        ],
      },
      {
        heading: "What we do with it",
        body: [
          "Fulfil your order and tell you where it is. Email you about a drop only if you asked us to.",
          "We do not sell it, rent it, or hand it to advertisers.",
        ],
      },
      {
        heading: "Who else sees it",
        body: [
          "Razorpay for payments. The courier for delivery. Our email provider to send you the receipt. That is the whole list.",
        ],
      },
      {
        heading: "Deleting it",
        body: [
          "Write to hello@zuary.in and we remove your record, minus the invoice data Indian tax law requires us to keep for eight years.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms",
    summary:
      "Prices in rupees including GST. Orders confirm on payment. No cash on delivery at launch.",
    updatedAt: "2026-07-01",
    sections: [
      {
        heading: "Prices",
        body: [
          "All prices are in Indian rupees and include GST. We can change a price before you pay. We cannot change it after.",
        ],
      },
      {
        heading: "Payment",
        body: [
          "Card, UPI and netbanking through Razorpay.",
          "No cash on delivery at launch. It costs more than the margin on a single trouser and the refusal rate makes fixed runs impossible to plan.",
        ],
      },
      {
        heading: "Stock",
        body: [
          "Drops are cut in fixed runs. An order is confirmed when payment clears, not when something enters your bag. If a size sells out between the two, we refund in full the same day.",
        ],
      },
      {
        heading: "Cancellation",
        body: [
          "Cancel any time before dispatch for a full refund. After dispatch it becomes a return.",
        ],
      },
    ],
  },
];

export const getPolicy = (slug: string) => POLICIES.find((p) => p.slug === slug);
