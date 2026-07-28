CREATE TABLE "conformance_packet_run" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"test_kits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ig_versions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"inferno_version" text NOT NULL,
	"target_endpoint" text NOT NULL,
	"auth_config_ref" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"results_matrix" jsonb,
	"progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"overall_result" text,
	"pass_count" integer,
	"fail_count" integer,
	"previous_run_id" text,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "encrypted_secret" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"ciphertext" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_bundle" (
	"id" text PRIMARY KEY NOT NULL,
	"packet_run_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"bundle_ref" text NOT NULL,
	"sha256" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"signed_pdf_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_bundle_packet_run_id_unique" UNIQUE("packet_run_id")
);
--> statement-breakpoint
CREATE INDEX "conformance_packet_run_workspace_idx" ON "conformance_packet_run" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "evidence_bundle_workspace_idx" ON "evidence_bundle" USING btree ("workspace_id","created_at");