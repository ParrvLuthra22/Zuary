import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
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

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  priceInr: integer("price_inr").notNull(),
  active: boolean("active").notNull().default(true),
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
  status: orderStatus("status").notNull().default("created"),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  addressJson: jsonb("address_json").$type<ShippingAddress>().notNull(),
  subtotalInr: integer("subtotal_inr").notNull(),
  shippingInr: integer("shipping_inr").notNull().default(0),
  totalInr: integer("total_inr").notNull(),
  razorpayOrderId: text("razorpay_order_id").unique(),
  razorpayPaymentId: text("razorpay_payment_id"),
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
