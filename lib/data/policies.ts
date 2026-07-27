export type Policy = {
  slug: string;
  title: string;
  updatedAt: string; // ISO date
  sections: { heading: string; body: string[] }[];
};

export const SHIPPING_FLAT_INR = 0;
export const FREE_SHIPPING_THRESHOLD_INR = 0;
export const RETURN_WINDOW_DAYS = 7;

export const POLICIES: Policy[] = [
  {
    slug: "shipping",
    title: "Shipping",
    updatedAt: "2026-07-01",
    sections: [
      {
        heading: "Where we ship",
        body: [
          "All states and union territories in India. No international shipping yet.",
        ],
      },
      {
        heading: "Cost",
        body: ["Free on every order. It is priced into the trouser."],
      },
      {
        heading: "Time",
        body: [
          "Dispatched within two working days of payment.",
          "Metro addresses: three to five working days after dispatch.",
          "Everywhere else: five to eight working days after dispatch.",
        ],
      },
      {
        heading: "Tracking",
        body: [
          "A tracking link goes out by email when the parcel leaves the warehouse.",
        ],
      },
    ],
  },
  {
    slug: "returns",
    title: "Returns & Exchanges",
    updatedAt: "2026-07-01",
    sections: [
      {
        heading: "Window",
        body: [
          `${RETURN_WINDOW_DAYS} days from delivery. Unworn, unwashed, tags on.`,
        ],
      },
      {
        heading: "Size exchanges",
        body: [
          "One free size exchange per order, subject to stock. We collect the first pair and ship the replacement together.",
        ],
      },
      {
        heading: "Refunds",
        body: [
          "Back to the original payment method within seven working days of the parcel reaching us.",
        ],
      },
      {
        heading: "What we cannot take back",
        body: [
          "Altered hems. Anything washed. Anything without tags.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy",
    updatedAt: "2026-07-01",
    sections: [
      {
        heading: "What we collect",
        body: [
          "Name, email, phone, and shipping address at checkout. Payment details go to Razorpay and never touch our servers.",
        ],
      },
      {
        heading: "What we do with it",
        body: [
          "Fulfil the order and tell you where it is. Email for a drop only if you asked us to.",
        ],
      },
      {
        heading: "Deletion",
        body: [
          "Write to hello@zuary.in and we remove your record, minus what tax law requires us to keep.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms",
    updatedAt: "2026-07-01",
    sections: [
      {
        heading: "Pricing",
        body: [
          "All prices in Indian rupees, inclusive of GST. We can change a price before you pay, never after.",
        ],
      },
      {
        heading: "Stock",
        body: [
          "Drops are cut in fixed runs. An order is confirmed when payment clears, not when it enters the cart.",
        ],
      },
      {
        heading: "Cancellation",
        body: ["Cancel any time before dispatch for a full refund."],
      },
    ],
  },
];

export const getPolicy = (slug: string) => POLICIES.find((p) => p.slug === slug);
