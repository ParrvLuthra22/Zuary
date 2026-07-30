ALTER TABLE "orders" ADD COLUMN "courier" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "confirmation_sent_at" timestamp with time zone;