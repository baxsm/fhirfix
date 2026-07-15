CREATE TABLE "api_key" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"hashed_key" text NOT NULL,
	"mode" text NOT NULL,
	"scopes" jsonb DEFAULT '["validate","convert","fix"]'::jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoint" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"url" text NOT NULL,
	"events" jsonb NOT NULL,
	"secret" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_delivery_status" text,
	"last_delivery_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_request_log" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"api_key_id" text,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"status_code" integer NOT NULL,
	"latency_ms" integer NOT NULL,
	"request_bytes" integer,
	"response_bytes" integer,
	"idempotency_key" text,
	"run_id" text,
	"ip" text,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "api_key_workspace_idx" ON "api_key" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "api_key_hash_idx" ON "api_key" USING btree ("hashed_key");--> statement-breakpoint
CREATE INDEX "webhook_endpoint_workspace_idx" ON "webhook_endpoint" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "api_log_workspace_idx" ON "api_request_log" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "api_log_key_idx" ON "api_request_log" USING btree ("api_key_id");