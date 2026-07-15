CREATE TABLE "billing_account" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"polar_customer_id" text,
	"balance_micro_credits" integer DEFAULT 0 NOT NULL,
	"auto_recharge_enabled" boolean DEFAULT false NOT NULL,
	"auto_recharge_threshold" integer,
	"auto_recharge_amount_cents" integer,
	"monthly_spend_cap_cents" integer,
	"billing_contact_user_id" text,
	"last_alert_threshold" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_account_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
CREATE TABLE "credit_ledger_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"type" text NOT NULL,
	"amount_micro_credits" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"related_run_id" text,
	"related_invoice_id" text,
	"description" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"credits_purchased_micro" integer NOT NULL,
	"status" text NOT NULL,
	"polar_order_id" text,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notification_log" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"channel" text NOT NULL,
	"type" text NOT NULL,
	"target" text NOT NULL,
	"status" text NOT NULL,
	"provider_message_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ledger_workspace_idx" ON "credit_ledger_entry" USING btree ("workspace_id","created_at");