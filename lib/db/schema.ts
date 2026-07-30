import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const orderStatus = pgEnum("order_status", [
  "created",
  "paid",
  "failed",
  "shipped",
  "delivered",
  "cancelled",
]);

/**
 * The catalogue.
 *
 * These columns used to live in lib/data/products.ts as a hand-edited array.
 * They are here so the admin can edit them; that file is now a seed, not a
 * runtime source. Everything is nullable except the four original columns —
 * rows written before this migration have none of it, and a half-populated
 * product should still render rather than throw.
 */
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  priceInr: integer("price_inr").notNull(),
  active: boolean("active").notNull().default(true),

  series: integer("series"),
  deva: text("deva"),
  devaMeaning: text("deva_meaning"),
  fit: text("fit").$type<"tailored" | "straight" | "pleated">(),
  hem: text("hem").$type<"turn-up" | "plain">(),
  swatch: text("swatch"),
  colour: text("colour"),
  fabric: text("fabric"),
  weight: text("weight"),
  mill: text("mill"),
  weave: text("weave"),
  shrinkage: text("shrinkage"),
  description: text("description"),
  fabricStory: text("fabric_story"),
  /** Repeatable list, edited as rows in the admin. */
  care: jsonb("care").$type<string[]>(),
  status: text("status").$type<"available" | "coming-soon">(),
  hasPhotography: boolean("has_photography"),
  liftedBackdrop: boolean("lifted_backdrop"),
  drop: text("drop"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const variants = pgTable("variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  size: text("size").notNull(),
  stock: integer("stock").notNull().default(0),
  sku: text("sku").notNull().unique(),
});

export type ShippingAddress = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  /**
   * Nullable, and it has to stay that way: every order placed before auth
   * existed has no user to point at, and guest checkout still writes rows with
   * this unset. New authenticated orders always carry it. Treat null as
   * "guest", never as "missing data".
   */
  userId: text("user_id").references(() => users.id),
  status: orderStatus("status").notNull().default("created"),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  addressJson: jsonb("address_json").$type<ShippingAddress>().notNull(),
  subtotalInr: integer("subtotal_inr").notNull(),
  shippingInr: integer("shipping_inr").notNull().default(0),
  totalInr: integer("total_inr").notNull(),
  razorpayOrderId: text("razorpay_order_id").unique(),
  razorpayPaymentId: text("razorpay_payment_id"),
  /**
   * The AWB — the courier's own consignment number.
   *
   * Named trackingNumber because it predates the admin work; it is the same
   * field the mark-shipped dialog calls "AWB". Not duplicated under a second
   * name, because two columns holding one number is how they drift apart.
   */
  trackingNumber: text("tracking_number"),
  /** Courier name, shown in the shipped email beside the AWB. */
  courier: text("courier"),
  /** Deep link, when the courier provides one. The AWB stands alone if not. */
  trackingUrl: text("tracking_url"),
  /**
   * When the confirmation email was sent.
   *
   * The de-duplication key for order confirmations. Two independent callers can
   * settle the same payment — the browser via /checkout/verify and Razorpay via
   * the webhook — and whichever loses the race must not send a second email.
   * Stamped inside the same transaction that flips the order to paid, so the
   * check and the claim cannot interleave.
   */
  confirmationSentAt: timestamp("confirmation_sent_at", {
    withTimezone: true,
  }),
  /** When it was handed to the courier. Distinct from updatedAt, which moves
   *  for any reason. */
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  variantId: integer("variant_id")
    .notNull()
    .references(() => variants.id),
  productSlug: text("product_slug").notNull(),
  size: text("size").notNull(),
  qty: integer("qty").notNull(),
  unitPriceInr: integer("unit_price_inr").notNull(),
});

export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  source: text("source").notNull().default("site"),
  /* Both nullable: the footer and shop forms are drop-wide and carry neither.
     Only the per-product notify drawer fills them in, and size is optional
     even there — we would rather have the email than lose it to a required
     field nobody wants to answer. */
  productSlug: text("product_slug"),
  size: text("size"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ── Auth ───────────────────────────────────────────────────────
   The users/accounts/sessions/verificationTokens shapes are dictated by
   @auth/drizzle-adapter, which maps by *property* name. The snake_case
   properties on `accounts` (refresh_token, expires_at, …) look out of place
   next to the rest of this file on purpose — rename them to camelCase and the
   adapter silently stops persisting OAuth tokens. */

export type UserRole = "customer" | "admin";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  phone: text("phone").unique(),
  phoneVerified: timestamp("phone_verified", { withTimezone: true }),
  /* Authorisation lives here, not in the token. The JWT carries a copy for
     cheap reads, but this column is the source of truth — see auth.ts. */
  role: text("role").$type<UserRole>().notNull().default("customer"),
  /**
   * Lets this account see an upcoming drop before it opens. Set by hand in the
   * database for now; the admin toggle arrives with B07. Separate from `role`
   * on purpose — early access is a customer perk, not a privilege escalation,
   * and conflating the two would mean granting it implies admin rights.
   */
  earlyAccess: boolean("early_access").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
  ],
);

/* Unused under the JWT strategy — no session rows are ever written. The
   adapter's type still requires the table, and leaving it out breaks a later
   switch to database sessions, so it stays. */
export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

/* Phone OTP. Nothing writes here until the flag is switched on. */
export const otpCodes = pgTable(
  "otp_codes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    phone: text("phone").notNull(),
    /* bcrypt hash. The raw code never touches the database, so a dump of this
       table cannot be replayed to sign in as anyone. */
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("otp_codes_phone_created_idx").on(table.phone, table.createdAt)],
);

/* ── Customer account ───────────────────────────────────────── */

export const addresses = pgTable("addresses", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  label: text("label"),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pincode: text("pincode").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const wishlist = pgTable(
  "wishlist",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /* Slug, not a products.id FK: the catalogue still lives in
       lib/data/products.ts and the DB products table is only a projection of
       it. A FK here would break the moment the two drift. */
    productSlug: text("product_slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.productSlug] })],
);

/* ── Admin ──────────────────────────────────────────────────── */

export const productImages = pgTable(
  "product_images",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    productSlug: text("product_slug").notNull(),
    /** Either a path under /public or an absolute Vercel Blob URL. */
    url: text("url").notNull(),
    source: text("source").$type<"static" | "blob">().notNull(),
    alt: text("alt").notNull(),
    blurDataUrl: text("blur_data_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("product_images_slug_sort_idx").on(table.productSlug, table.sortOrder),
  ],
);

/* Append-only. No update or delete path should ever be written against this
   table — an audit log you can edit is not an audit log. */
export const adminAuditLog = pgTable("admin_audit_log", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  actorUserId: text("actor_user_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Variant = typeof variants.$inferSelect;
export type NewVariant = typeof variants.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type WaitlistEntry = typeof waitlist.$inferSelect;
export type OrderStatus = (typeof orderStatus.enumValues)[number];

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;
export type WishlistRow = typeof wishlist.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type NewProductImage = typeof productImages.$inferInsert;
export type OtpCode = typeof otpCodes.$inferSelect;
export type AdminAuditEntry = typeof adminAuditLog.$inferSelect;
export type NewAdminAuditEntry = typeof adminAuditLog.$inferInsert;
