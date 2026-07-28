CREATE TABLE "audit_log_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"target_ref" text,
	"ip" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_workspace_idx" ON "audit_log_entry" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_action_idx" ON "audit_log_entry" USING btree ("workspace_id","action");