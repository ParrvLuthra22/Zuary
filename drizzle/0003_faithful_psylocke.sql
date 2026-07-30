ALTER TABLE "orders" ADD COLUMN "tracking_number" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "early_access" boolean DEFAULT false NOT NULL;