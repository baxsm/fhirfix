CREATE TABLE IF NOT EXISTS "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"notification_prefs" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"default_profiles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_terminology_server" text,
	"redaction_policy" text DEFAULT 'on_ingest' NOT NULL,
	"data_retention_days" integer DEFAULT 30 NOT NULL,
	"baa_status" text DEFAULT 'none' NOT NULL,
	"plan_tier" text DEFAULT 'free' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_settings_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finding" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"severity" text NOT NULL,
	"category" text NOT NULL,
	"rule_source" text NOT NULL,
	"spec_citation" text NOT NULL,
	"resource_type" text,
	"fhirpath" text,
	"raw_validator_message" text NOT NULL,
	"plain_message" text NOT NULL,
	"suggested_fix" text NOT NULL,
	"fix_confidence" text NOT NULL,
	"fix_status" text DEFAULT 'suggested' NOT NULL,
	"dismissed_by" text,
	"dedup_fingerprint" text NOT NULL,
	"occurrence_count" integer DEFAULT 1 NOT NULL,
	"rank" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "run" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"source" text NOT NULL,
	"input_type" text NOT NULL,
	"fhir_version" text,
	"profiles_applied" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"terminology_server" text,
	"engine_version" text NOT NULL,
	"ig_versions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"resource_count" integer DEFAULT 0 NOT NULL,
	"conformance_score_before" integer,
	"conformance_score_after" integer,
	"auto_fix_applied" boolean DEFAULT false NOT NULL,
	"findings_total" integer DEFAULT 0 NOT NULL,
	"findings_auto_fixable" integer DEFAULT 0 NOT NULL,
	"credits_charged" integer DEFAULT 0 NOT NULL,
	"idempotency_key" text,
	"request_hash" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"input_ref" text,
	"corrected_ref" text,
	"retention_expires_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mapping_registry_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"scope" text DEFAULT 'workspace' NOT NULL,
	"source_system" text,
	"type" text NOT NULL,
	"source_value" text NOT NULL,
	"target_value" text NOT NULL,
	"target_system" text,
	"status" text DEFAULT 'suggested' NOT NULL,
	"confidence" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"supersedes_id" text,
	"superseded_by_id" text,
	"created_by" text NOT NULL,
	"approved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stored_object" (
	"key" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"bucket" text NOT NULL,
	"kind" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"content_type" text NOT NULL,
	"sha256" text NOT NULL,
	"encrypted" boolean DEFAULT true NOT NULL,
	"contains_phi" boolean DEFAULT false NOT NULL,
	"upload_state" text DEFAULT 'pending' NOT NULL,
	"retention_expires_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invitation_organizationId_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_organizationId_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_userId_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organization_slug_uidx" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finding_run_idx" ON "finding" USING btree ("run_id","rank");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finding_fingerprint_idx" ON "finding" USING btree ("workspace_id","dedup_fingerprint");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "run_workspace_idx" ON "run" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "run_idem_idx" ON "run" USING btree ("workspace_id","idempotency_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mapping_lookup_idx" ON "mapping_registry_entry" USING btree ("workspace_id","type","source_value","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stored_object_expiry_idx" ON "stored_object" USING btree ("retention_expires_at");