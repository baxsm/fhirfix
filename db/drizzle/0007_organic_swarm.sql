CREATE TABLE "drift_alert" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"scheduled_check_id" text NOT NULL,
	"run_id" text,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"metric_before" text,
	"metric_after" text,
	"detail" text,
	"acknowledged_by" text,
	"acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_check" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"schedule_cron" text NOT NULL,
	"target_type" text NOT NULL,
	"target_ref" text NOT NULL,
	"profiles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"registry_scope" text,
	"baseline_config" jsonb,
	"alert_channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_run_id" text,
	"last_run_at" timestamp with time zone,
	"last_error" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "drift_alert_workspace_idx" ON "drift_alert" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "drift_alert_check_idx" ON "drift_alert" USING btree ("scheduled_check_id","created_at");--> statement-breakpoint
CREATE INDEX "scheduled_check_workspace_idx" ON "scheduled_check" USING btree ("workspace_id","created_at");